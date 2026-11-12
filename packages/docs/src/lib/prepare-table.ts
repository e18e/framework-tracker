import type { TableColumn } from '../components/StatsTable.astro'
import type {
  ChartDatum,
  ChartValueFormat,
  LineComparisonSeries,
} from './types'
import { prepareInitialLoadResources } from './initial-load'
import { formatChartValue } from './chart'
import { frameworks } from '@framework-performance/results/frameworks'
import { getCollection } from 'astro:content'
import { formatBytesToMB, formatTimeMs, getFrameworkSlug } from './utils'

import type { CombinedResult } from '@framework-performance/results/storage'
import { prepareStarterResult, prepareRuntimeResult } from './result-content'
const resultFiles = import.meta.glob<CombinedResult>(
  '../../../results/data/**/latest.json',
  { eager: true, import: 'default' },
)
const results = Object.values(resultFiles).sort(
  (a, b) =>
    frameworks.findIndex((f) => f.name === a.framework) -
    frameworks.findIndex((f) => f.name === b.framework),
)
const starterStats = results
  .filter((result) => result.projects.starter)
  .map(prepareStarterResult)
const ssrRequestThroughputStats = results
  .filter((result) => result.projects.app)
  .map(prepareRuntimeResult)
const cwvEntries = await getCollection('cwv')
const codeComparisonEntries = await getCollection('codeComparison')

export type Device = 'desktop' | 'mobile'

export const cwvStats = (device: Device) =>
  cwvEntries
    .map(({ data }) => ({
      name: data.name,
      package: data.package,
      overallPercent: Math.floor(data.overall[device] * 100),
      lcpPercent: Math.floor(data.lcp[device] * 100),
      clsPercent: Math.floor(data.cls[device] * 100),
      fcpPercent: Math.floor(data.fcp[device] * 100),
      ttfbPercent: Math.floor(data.ttfb[device] * 100),
      inpPercent: Math.floor(data.inp[device] * 100),
    }))
    .sort((a, b) => b.overallPercent - a.overallPercent)

export function getCodeComparison(example: string) {
  return starterStats.map((framework) => {
    const slug = getFrameworkSlug(framework.package)
    return {
      name: framework.name,
      package: framework.package,
      slug,
      entry: codeComparisonEntries.find(
        (entry) => entry.id === `${example}/${slug}`,
      ),
    }
  })
}

type RuntimeData = (typeof ssrRequestThroughputStats)[number]

export type SSRLoadKey = 'ssrLoadTests' | 'ssrRouterLinkLoadTests'

function getSSRLoadLatencyStage(
  framework: RuntimeData,
  workers: number,
  key: SSRLoadKey = 'ssrLoadTests',
) {
  return framework[key]?.stages.find((stage) => stage.workers === workers)
}

export const getSSRLoadStats = (key: SSRLoadKey = 'ssrLoadTests') =>
  ssrRequestThroughputStats
    .filter(
      (framework) =>
        framework[key] != null &&
        Number.isFinite(
          framework[key].representativePeak.requestsPerSec.value,
        ) &&
        getSSRLoadLatencyStage(framework, 25, key) != null &&
        getSSRLoadLatencyStage(framework, 50, key) != null &&
        getSSRLoadLatencyStage(framework, 100, key) != null,
    )
    .map((framework) => {
      const worker25Stage = getSSRLoadLatencyStage(framework, 25, key)!
      const worker50Stage = getSSRLoadLatencyStage(framework, 50, key)!
      const worker100Stage = getSSRLoadLatencyStage(framework, 100, key)!
      return {
        name: framework.name,
        package: framework.package,

        peakRequestsPerSec:
          framework[
            key
          ]!.representativePeak.requestsPerSec.value.toLocaleString(),
        peakWorkers:
          framework[key]!.representativePeak.workers.toLocaleString(),
        worker25P99LatencyMs: `${worker25Stage.p99LatencyMs.toLocaleString(undefined, { maximumFractionDigits: 3 })}ms`,
        worker50P99LatencyMs: `${worker50Stage.p99LatencyMs.toLocaleString(undefined, { maximumFractionDigits: 3 })}ms`,
        worker100P99LatencyMs: `${worker100Stage.p99LatencyMs.toLocaleString(undefined, { maximumFractionDigits: 3 })}ms`,
        totalRequests: framework[key]!.totalRequests.value.toLocaleString(),
      }
    })

export const serverSideRenderedStats = ssrRequestThroughputStats
  .filter(
    (framework) =>
      framework.serverSideRenderedTests != null &&
      Number.isFinite(framework.serverSideRenderedTests.firstPaintMs),
  )
  .map((framework) => {
    const tests = framework.serverSideRenderedTests!
    const interaction = tests.interactionTests

    return {
      name: framework.name,
      package: framework.package,
      firstPaintMs: formatMilliseconds(tests.firstPaintMs),
      fcpMs: formatMilliseconds(tests.fcpMs),
      interactionLatencyMs: formatMilliseconds(
        interaction?.interactionLatencyMs,
      ),
      inputDelayMs: formatMilliseconds(interaction?.inputDelayMs),
      processingDurationMs: formatMilliseconds(
        interaction?.processingDurationMs,
      ),
      presentationDelayMs: formatMilliseconds(interaction?.presentationDelayMs),
    }
  })

export const clientSideRenderedStats = ssrRequestThroughputStats
  .filter(
    (framework) =>
      framework.clientSideRenderedTests != null &&
      Number.isFinite(framework.clientSideRenderedTests.firstPaintMs),
  )
  .map((framework) => {
    const tests = framework.clientSideRenderedTests!
    const interaction = tests.interactionTests

    return {
      name: framework.name,
      package: framework.package,
      firstPaintMs: formatMilliseconds(tests.firstPaintMs),
      fcpMs: formatMilliseconds(tests.fcpMs),
      interactionLatencyMs: formatMilliseconds(
        interaction?.interactionLatencyMs,
      ),
      inputDelayMs: formatMilliseconds(interaction?.inputDelayMs),
      processingDurationMs: formatMilliseconds(
        interaction?.processingDurationMs,
      ),
      presentationDelayMs: formatMilliseconds(interaction?.presentationDelayMs),
    }
  })

function formatMilliseconds(value: number | undefined) {
  return value != null && Number.isFinite(value)
    ? `${Number(value.toFixed(3))}ms`
    : '—'
}

export const depsStats = starterStats.map((f) => ({
  name: f.name,
  package: f.package,
  directDependencies: [
    f.devDependencies.value.toLocaleString(),
    f.prodDependencies.value.toLocaleString(),
  ].join(' / '),
  prodDependencies: f.prodDependencies.value,
  devDependencies: f.devDependencies.value,
  allDependencies: f.allDependencies.value.toLocaleString(),
  duplicateDependencies: f.duplicateDependencies?.value,
  nodeModulesSize: formatBytesToMB(f.install.nodeModulesSizeBytes.value),
  depInstallSize:
    f.depInstallSize != null ? formatBytesToMB(f.depInstallSize.value) : '—',
  graph: 'View',
}))

export const firstPartyDepsStats = starterStats.map((f) => {
  const dependencies = f.firstPartyDependencies

  return {
    name: f.name,
    package: f.package,
    directDependencies: [
      dependencies.devDependencies.value.toLocaleString(),
      dependencies.prodDependencies.value.toLocaleString(),
    ].join(' / '),
    allDependencies: dependencies.allDependencies.value.toLocaleString(),
    duplicateDependencies: dependencies.duplicateDependencies?.value ?? '—',
    graph: 'View',
  }
})

export const minimumNodeVersionTableData = starterStats.map((f) => ({
  name: f.name,
  package: f.package,
  minNodeVersion: f.minimumNodeVersion ? `v${f.minimumNodeVersion}` : '—',
  imposedBy: f.minimumNodeVersionImposedBy?.length
    ? f.minimumNodeVersionImposedBy.join(', ')
    : '—',
}))

const frameworkPackageNames: Record<string, string> = {
  'starter-astro': 'astro',
  'starter-next-js': 'next',
  'starter-nuxt': 'nuxt',
  'starter-pracht': '@pracht/core',
  'starter-react-router': '@react-router/dev',
  'starter-solid': 'solid-js',
  'starter-solid-start': '@solidjs/start',
  'starter-sveltekit': '@sveltejs/kit',
  'starter-tanstack-start-react': '@tanstack/react-start',
}

export const frameworkDepsStats = starterStats.flatMap((f) => {
  const dependencies = f.frameworkDependencies
  const frameworkPackage = frameworkPackageNames[f.package]
  if (dependencies == null || frameworkPackage == null) return []

  const graphQuery =
    f.frameworkVersion != null && f.frameworkVersion !== 'unknown'
      ? `${frameworkPackage}@${f.frameworkVersion}`
      : frameworkPackage

  return [
    {
      name: f.name,
      package: f.package,
      allDependencies: dependencies.allDependencies.value.toLocaleString(),
      devDependencies: dependencies.devDependencies.value.toLocaleString(),
      prodDependencies: dependencies.prodDependencies.value.toLocaleString(),
      graph: 'View',
      graphUrl: `https://npmgraph.js.org/?q=${encodeURIComponent(graphQuery)}`,
    },
  ]
})

export const buildInstallData = starterStats.map((f) => ({
  name: f.name,
  package: f.package,
  medianInstall: formatTimeMs(f.install.installTimeMs.median),
  minInstall: formatTimeMs(f.install.installTimeMs.min),
  maxInstall: formatTimeMs(f.install.installTimeMs.max),
  medianColdBuild: formatTimeMs(f.coldBuildTime.medianMs),
  minColdBuild: formatTimeMs(f.coldBuildTime.minMs),
  maxColdBuild: formatTimeMs(f.coldBuildTime.maxMs),
  medianWarmBuild: formatTimeMs(f.warmBuildTime.medianMs),
  minWarmBuild: formatTimeMs(f.warmBuildTime.minMs),
  maxWarmBuild: formatTimeMs(f.warmBuildTime.maxMs),
}))

export const devServerStartData = starterStats.map((f) => ({
  name: f.name,
  package: f.package,
  medianStart: formatTimeMs(f.devServerStartTime?.medianMs ?? Number.NaN),
  minStart: formatTimeMs(f.devServerStartTime?.minMs ?? Number.NaN),
  maxStart: formatTimeMs(f.devServerStartTime?.maxMs ?? Number.NaN),
}))

export const coreJsTableData = starterStats.map((f) => {
  const hasCorejs = (f.vendoredCoreJsSize?.value ?? 0) > 0
  return {
    name: f.name,
    package: f.package,
    detected: f.vendoredCoreJsSize == null ? '—' : hasCorejs ? 'Yes' : 'No',
    bundledSize: hasCorejs
      ? `${((f.vendoredCoreJsSize?.value ?? 0) / 1024).toFixed(1)} KB`
      : '—',
    unnecessaryModules: hasCorejs
      ? String(f.vendoredCoreJsUnnecessaryModules?.length ?? 0)
      : '—',
  }
})

export function formatBaselineStatus(
  status: 'high' | 'low' | false | null | undefined,
  featureCount: number | undefined,
) {
  if (featureCount === 0) return '—'
  if (status === 'high') return 'High'
  if (status === 'low') return 'Low'
  if (status === false) return 'Limited'
  return '—'
}

export function formatBaselineReason(
  reason: string | string[] | null | undefined,
): string {
  if (Array.isArray(reason)) return reason.length > 0 ? reason.join(', ') : '—'
  return reason ?? '—'
}

export const browserBaselineTableData = starterStats.map((f) => {
  const baseline = f.browserBaselineTests
  return {
    name: f.name,
    package: f.package,
    status: formatBaselineStatus(
      baseline?.baselineStatus,
      baseline?.baselineFeatureCount?.value,
    ),
    feature: formatBaselineReason(baseline?.baselineReason),
    year:
      baseline?.baselineFeatureCount?.value === 0
        ? '—'
        : baseline?.baselineYear != null
          ? String(baseline.baselineYear)
          : '—',
    features:
      baseline?.baselineFeatureCount != null
        ? baseline.baselineFeatureCount.value.toLocaleString()
        : '—',
  }
})

export const requestThroughputTableData = ssrRequestThroughputStats.flatMap(
  (f) => {
    const tests = f.ssrRequestThroughputTests
    if (!tests) return []
    return [
      {
        name: f.name,
        package: f.package,
        opsPerSec: Math.round(tests.opsPerSec).toLocaleString(),
        latencyMs: `${Number(tests.latencyMs.toFixed(3))}${tests.latencyUnit}`,
        bodySizeKb: `${tests.bodySizeKb.value} ${tests.bodySizeKb.unit}`,
        duplicationFactor: `${tests.duplicationFactor.value}x`,
      },
    ]
  },
)

export const initialLoadTableData = ssrRequestThroughputStats.flatMap(
  (framework) => {
    const resources = framework.initialLoadTests?.resources
    if (!resources) return []
    return [
      {
        name: framework.name,
        package: framework.package,
        requests: resources.total.requestCount.value,
        total: formatChartValue(
          resources.total.transferSize.value / 1024,
          'kb',
        ),
        ...Object.fromEntries(
          Object.entries(prepareInitialLoadResources(resources)).map(
            ([key, value]) => [key, formatChartValue(value, 'kb')],
          ),
        ),
      },
    ]
  },
)

type ComparisonTableInput = {
  title: string
  data: ChartDatum[]
  valueFormat: ChartValueFormat
  yAxisLabel: string
}
type StackedTableInput = {
  title: string
  data: { name: string; values: Record<string, number> }[]
  series: { key: string; label: string }[]
  valueFormat?: ChartValueFormat
}
type LatencyTableInput = {
  title: string
  xValues: string[]
  series: LineComparisonSeries[]
  valueFormat: ChartValueFormat
}
const frameworkDefinition = (name: string) =>
  frameworks.find((f) => f.displayName === name || f.name === name)
function frameworkColumn(): TableColumn {
  return {
    key: 'name',
    header: 'Framework',
    nameCell: true,
    alignment: 'left',
    href: (row) => {
      const f = frameworkDefinition(String(row.name))
      return f && f.name !== 'baseline-html'
        ? `/framework/${getFrameworkSlug(f.starter?.package ?? f.app?.package ?? f.name)}/`
        : '/run-time/#server-side-throughput-tests'
    },
  }
}
function dependencyGraphColumn(
  source: 'core' | 'first-party' | 'starter',
): TableColumn {
  return {
    key: 'graph',
    header: 'Graph',
    href: (row) => {
      const name = String(row.name)
      if (source === 'core')
        return frameworkDepsStats.find((f) => f.name === name)?.graphUrl
      const framework = frameworkDefinition(name)
      const file =
        source === 'first-party'
          ? 'first-party-dependencies.json'
          : 'package.json'
      return framework?.starter
        ? `https://npmgraph.js.org/?q=https://github.com/e18e/framework-performance/blob/main/packages/${framework.starter.package}/${file}`
        : null
    },
  }
}

export function prepareProductionBuildSizeTable(input: ComparisonTableInput) {
  const columns: TableColumn[] = [
    frameworkColumn(),
    { key: 'value', header: input.yAxisLabel },
  ]
  if (input.data.some((row) => row.range))
    columns.push(
      { key: 'min', header: 'Minimum' },
      { key: 'max', header: 'Maximum' },
    )
  return {
    label: `${input.title} data`,
    columns,
    data: input.data.map((row) => ({
      name: row.name,
      value: formatChartValue(row.value, input.valueFormat),
      min: row.range ? formatChartValue(row.range.min, input.valueFormat) : '—',
      max: row.range ? formatChartValue(row.range.max, input.valueFormat) : '—',
    })),
  }
}

export function prepareBuildSizeTable(input: ComparisonTableInput) {
  const columns: TableColumn[] = [
    frameworkColumn(),
    { key: 'value', header: input.yAxisLabel },
  ]
  if (input.data.some((row) => row.range))
    columns.push(
      { key: 'min', header: 'Minimum' },
      { key: 'max', header: 'Maximum' },
    )
  return {
    label: `${input.title} data`,
    columns,
    data: input.data.map((row) => ({
      name: row.name,
      value: formatChartValue(row.value, input.valueFormat),
      min: row.range ? formatChartValue(row.range.min, input.valueFormat) : '—',
      max: row.range ? formatChartValue(row.range.max, input.valueFormat) : '—',
    })),
  }
}

export function prepareInstallTimeTable(input: ComparisonTableInput) {
  const columns: TableColumn[] = [
    frameworkColumn(),
    { key: 'value', header: input.yAxisLabel },
  ]
  if (input.data.some((row) => row.range))
    columns.push(
      { key: 'min', header: 'Minimum' },
      { key: 'max', header: 'Maximum' },
    )
  return {
    label: `${input.title} data`,
    columns,
    data: input.data.map((row) => ({
      name: row.name,
      value: formatChartValue(row.value, input.valueFormat),
      min: row.range ? formatChartValue(row.range.min, input.valueFormat) : '—',
      max: row.range ? formatChartValue(row.range.max, input.valueFormat) : '—',
    })),
  }
}

export function prepareDevServerStartupTable(input: ComparisonTableInput) {
  const columns: TableColumn[] = [
    frameworkColumn(),
    { key: 'value', header: input.yAxisLabel },
  ]
  if (input.data.some((row) => row.range))
    columns.push(
      { key: 'min', header: 'Minimum' },
      { key: 'max', header: 'Maximum' },
    )
  return {
    label: `${input.title} data`,
    columns,
    data: input.data.map((row) => ({
      name: row.name,
      value: formatChartValue(row.value, input.valueFormat),
      min: row.range ? formatChartValue(row.range.min, input.valueFormat) : '—',
      max: row.range ? formatChartValue(row.range.max, input.valueFormat) : '—',
    })),
  }
}

export function prepareStarterDependenciesTable(input: StackedTableInput) {
  const format = (value: number) =>
    formatChartValue(value, input.valueFormat ?? 'kb')
  const columns: TableColumn[] = [
    frameworkColumn(),
    ...input.series.map((s) => ({ key: s.key, header: s.label })),
    { key: 'total', header: 'Total' },
    dependencyGraphColumn('starter'),
  ]
  return {
    label: `${input.title} data`,
    columns,
    data: input.data.map((row) => ({
      name: row.name,
      graph: 'View graph',
      ...Object.fromEntries(
        input.series.map((s) => [s.key, format(row.values[s.key] ?? 0)]),
      ),
      total: format(
        input.series.reduce((sum, s) => sum + (row.values[s.key] ?? 0), 0),
      ),
    })),
  }
}

export function prepareDependenciesTable(input: ComparisonTableInput) {
  const columns: TableColumn[] = [
    frameworkColumn(),
    { key: 'value', header: input.yAxisLabel },
  ]
  if (input.data.some((row) => row.range))
    columns.push(
      { key: 'min', header: 'Minimum' },
      { key: 'max', header: 'Maximum' },
    )
  return {
    label: `${input.title} data`,
    columns,
    data: input.data.map((row) => ({
      name: row.name,
      value: formatChartValue(row.value, input.valueFormat),
      min: row.range ? formatChartValue(row.range.min, input.valueFormat) : '—',
      max: row.range ? formatChartValue(row.range.max, input.valueFormat) : '—',
    })),
  }
}

export function prepareProductionDependenciesTable(
  input: ComparisonTableInput,
) {
  const columns: TableColumn[] = [
    frameworkColumn(),
    { key: 'value', header: input.yAxisLabel },
  ]
  if (input.data.some((row) => row.range))
    columns.push(
      { key: 'min', header: 'Minimum' },
      { key: 'max', header: 'Maximum' },
    )
  return {
    label: `${input.title} data`,
    columns,
    data: input.data.map((row) => ({
      name: row.name,
      value: formatChartValue(row.value, input.valueFormat),
      min: row.range ? formatChartValue(row.range.min, input.valueFormat) : '—',
      max: row.range ? formatChartValue(row.range.max, input.valueFormat) : '—',
    })),
  }
}

export function prepareCorePackageDependenciesTable(input: StackedTableInput) {
  const format = (value: number) =>
    formatChartValue(value, input.valueFormat ?? 'kb')
  const columns: TableColumn[] = [
    frameworkColumn(),
    ...input.series.map((s) => ({ key: s.key, header: s.label })),
    { key: 'total', header: 'Total' },
    dependencyGraphColumn('core'),
  ]
  return {
    label: `${input.title} data`,
    columns,
    data: input.data.map((row) => ({
      name: row.name,
      graph: 'View graph',
      ...Object.fromEntries(
        input.series.map((s) => [s.key, format(row.values[s.key] ?? 0)]),
      ),
      total: format(
        input.series.reduce((sum, s) => sum + (row.values[s.key] ?? 0), 0),
      ),
    })),
  }
}

export function prepareFirstPartyDuplicateDependenciesTable(
  input: ComparisonTableInput,
) {
  const columns: TableColumn[] = [
    frameworkColumn(),
    { key: 'value', header: input.yAxisLabel },
    dependencyGraphColumn('first-party'),
  ]
  if (input.data.some((row) => row.range))
    columns.push(
      { key: 'min', header: 'Minimum' },
      { key: 'max', header: 'Maximum' },
    )
  return {
    label: `${input.title} data`,
    columns,
    data: input.data.map((row) => ({
      name: row.name,
      graph: 'View graph',
      value: formatChartValue(row.value, input.valueFormat),
      min: row.range ? formatChartValue(row.range.min, input.valueFormat) : '—',
      max: row.range ? formatChartValue(row.range.max, input.valueFormat) : '—',
    })),
  }
}

export function prepareFirstPartyDependenciesTable(input: StackedTableInput) {
  const format = (value: number) =>
    formatChartValue(value, input.valueFormat ?? 'kb')
  const columns: TableColumn[] = [
    frameworkColumn(),
    ...input.series.map((s) => ({ key: s.key, header: s.label })),
    { key: 'total', header: 'Total' },
    dependencyGraphColumn('first-party'),
  ]
  return {
    label: `${input.title} data`,
    columns,
    data: input.data.map((row) => ({
      name: row.name,
      graph: 'View graph',
      ...Object.fromEntries(
        input.series.map((s) => [s.key, format(row.values[s.key] ?? 0)]),
      ),
      total: format(
        input.series.reduce((sum, s) => sum + (row.values[s.key] ?? 0), 0),
      ),
    })),
  }
}

export function prepareDuplicateDependenciesTable(input: ComparisonTableInput) {
  const columns: TableColumn[] = [
    frameworkColumn(),
    { key: 'value', header: input.yAxisLabel },
    dependencyGraphColumn('starter'),
  ]
  if (input.data.some((row) => row.range))
    columns.push(
      { key: 'min', header: 'Minimum' },
      { key: 'max', header: 'Maximum' },
    )
  return {
    label: `${input.title} data`,
    columns,
    data: input.data.map((row) => ({
      name: row.name,
      graph: 'View graph',
      value: formatChartValue(row.value, input.valueFormat),
      min: row.range ? formatChartValue(row.range.min, input.valueFormat) : '—',
      max: row.range ? formatChartValue(row.range.max, input.valueFormat) : '—',
    })),
  }
}

export function prepareSSRResponseBodySizeTable(input: ComparisonTableInput) {
  const columns: TableColumn[] = [
    frameworkColumn(),
    { key: 'value', header: input.yAxisLabel },
  ]
  if (input.data.some((row) => row.range))
    columns.push(
      { key: 'min', header: 'Minimum' },
      { key: 'max', header: 'Maximum' },
    )
  return {
    label: `${input.title} data`,
    columns,
    data: input.data.map((row) => ({
      name: row.name,
      value: formatChartValue(row.value, input.valueFormat),
      min: row.range ? formatChartValue(row.range.min, input.valueFormat) : '—',
      max: row.range ? formatChartValue(row.range.max, input.valueFormat) : '—',
    })),
  }
}

export function prepareSSRThroughputTable(input: ComparisonTableInput) {
  const columns: TableColumn[] = [
    frameworkColumn(),
    { key: 'value', header: input.yAxisLabel },
  ]
  if (input.data.some((row) => row.range))
    columns.push(
      { key: 'min', header: 'Minimum' },
      { key: 'max', header: 'Maximum' },
    )
  return {
    label: `${input.title} data`,
    columns,
    data: input.data.map((row) => ({
      name: row.name,
      value: formatChartValue(row.value, input.valueFormat),
      min: row.range ? formatChartValue(row.range.min, input.valueFormat) : '—',
      max: row.range ? formatChartValue(row.range.max, input.valueFormat) : '—',
    })),
  }
}

export function prepareSSRRequestLatencyTable(input: ComparisonTableInput) {
  const columns: TableColumn[] = [
    frameworkColumn(),
    { key: 'value', header: input.yAxisLabel },
  ]
  if (input.data.some((row) => row.range))
    columns.push(
      { key: 'min', header: 'Minimum' },
      { key: 'max', header: 'Maximum' },
    )
  return {
    label: `${input.title} data`,
    columns,
    data: input.data.map((row) => ({
      name: row.name,
      value: formatChartValue(row.value, input.valueFormat),
      min: row.range ? formatChartValue(row.range.min, input.valueFormat) : '—',
      max: row.range ? formatChartValue(row.range.max, input.valueFormat) : '—',
    })),
  }
}

export function prepareCoreWebVitalTable(input: ComparisonTableInput) {
  const columns: TableColumn[] = [
    frameworkColumn(),
    { key: 'value', header: input.yAxisLabel },
  ]
  if (input.data.some((row) => row.range))
    columns.push(
      { key: 'min', header: 'Minimum' },
      { key: 'max', header: 'Maximum' },
    )
  return {
    label: `${input.title} data`,
    columns,
    data: input.data.map((row) => ({
      name: row.name,
      value: formatChartValue(row.value, input.valueFormat),
      min: row.range ? formatChartValue(row.range.min, input.valueFormat) : '—',
      max: row.range ? formatChartValue(row.range.max, input.valueFormat) : '—',
    })),
  }
}

export function prepareSSRLoadP75Table(input: LatencyTableInput) {
  return {
    label: `${input.title} data`,
    columns: [
      frameworkColumn(),
      ...input.xValues.map((x) => ({ key: x, header: x })),
    ],
    data: input.series.map((s) => ({
      name: s.name,
      ...Object.fromEntries(
        input.xValues.map((x) => {
          const point = s.points.find((p) => p.x === x)
          return [
            x,
            point?.value == null
              ? '—'
              : formatChartValue(point.value, input.valueFormat),
          ]
        }),
      ),
    })),
  }
}

export function prepareSSRLoadP99Table(input: LatencyTableInput) {
  return {
    label: `${input.title} data`,
    columns: [
      frameworkColumn(),
      ...input.xValues.map((x) => ({ key: x, header: x })),
    ],
    data: input.series.map((s) => ({
      name: s.name,
      ...Object.fromEntries(
        input.xValues.map((x) => {
          const point = s.points.find((p) => p.x === x)
          return [
            x,
            point?.value == null
              ? '—'
              : formatChartValue(point.value, input.valueFormat),
          ]
        }),
      ),
    })),
  }
}

export function prepareSSRLoadP90Table(input: LatencyTableInput) {
  return {
    label: `${input.title} data`,
    columns: [
      frameworkColumn(),
      ...input.xValues.map((x) => ({ key: x, header: x })),
    ],
    data: input.series.map((s) => ({
      name: s.name,
      ...Object.fromEntries(
        input.xValues.map((x) => {
          const point = s.points.find((p) => p.x === x)
          return [
            x,
            point?.value == null
              ? '—'
              : formatChartValue(point.value, input.valueFormat),
          ]
        }),
      ),
    })),
  }
}

export function prepareInteractionBreakdownTable(input: StackedTableInput) {
  const format = (value: number) =>
    formatChartValue(value, input.valueFormat ?? 'kb')
  const columns: TableColumn[] = [
    frameworkColumn(),
    ...input.series.map((s) => ({ key: s.key, header: s.label })),
    { key: 'total', header: 'Total' },
  ]
  return {
    label: `${input.title} data`,
    columns,
    data: input.data.map((row) => ({
      name: row.name,
      ...Object.fromEntries(
        input.series.map((s) => [s.key, format(row.values[s.key] ?? 0)]),
      ),
      total: format(
        input.series.reduce((sum, s) => sum + (row.values[s.key] ?? 0), 0),
      ),
    })),
  }
}

export function prepareClientRenderedFPTable(input: ComparisonTableInput) {
  const columns: TableColumn[] = [
    frameworkColumn(),
    { key: 'value', header: input.yAxisLabel },
  ]
  if (input.data.some((row) => row.range))
    columns.push(
      { key: 'min', header: 'Minimum' },
      { key: 'max', header: 'Maximum' },
    )
  return {
    label: `${input.title} data`,
    columns,
    data: input.data.map((row) => ({
      name: row.name,
      value: formatChartValue(row.value, input.valueFormat),
      min: row.range ? formatChartValue(row.range.min, input.valueFormat) : '—',
      max: row.range ? formatChartValue(row.range.max, input.valueFormat) : '—',
    })),
  }
}

export function prepareClientRenderedFCPTable(input: ComparisonTableInput) {
  const columns: TableColumn[] = [
    frameworkColumn(),
    { key: 'value', header: input.yAxisLabel },
  ]
  if (input.data.some((row) => row.range))
    columns.push(
      { key: 'min', header: 'Minimum' },
      { key: 'max', header: 'Maximum' },
    )
  return {
    label: `${input.title} data`,
    columns,
    data: input.data.map((row) => ({
      name: row.name,
      value: formatChartValue(row.value, input.valueFormat),
      min: row.range ? formatChartValue(row.range.min, input.valueFormat) : '—',
      max: row.range ? formatChartValue(row.range.max, input.valueFormat) : '—',
    })),
  }
}

export function prepareInitialLoadTable(input: StackedTableInput) {
  const format = (value: number) =>
    formatChartValue(value, input.valueFormat ?? 'kb')
  const columns: TableColumn[] = [
    frameworkColumn(),
    ...input.series.map((s) => ({ key: s.key, header: s.label })),
    { key: 'total', header: 'Total' },
  ]
  return {
    label: `${input.title} data`,
    columns,
    data: input.data.map((row) => ({
      name: row.name,
      ...Object.fromEntries(
        input.series.map((s) => [s.key, format(row.values[s.key] ?? 0)]),
      ),
      total: format(
        input.series.reduce((sum, s) => sum + (row.values[s.key] ?? 0), 0),
      ),
    })),
  }
}

export function prepareInitialLoadWithoutJavaScriptTable(
  input: StackedTableInput,
) {
  const format = (value: number) =>
    formatChartValue(value, input.valueFormat ?? 'kb')
  const columns: TableColumn[] = [
    frameworkColumn(),
    ...input.series.map((s) => ({ key: s.key, header: s.label })),
    { key: 'total', header: 'Total' },
  ]
  return {
    label: `${input.title} data`,
    columns,
    data: input.data.map((row) => ({
      name: row.name,
      ...Object.fromEntries(
        input.series.map((s) => [s.key, format(row.values[s.key] ?? 0)]),
      ),
      total: format(
        input.series.reduce((sum, s) => sum + (row.values[s.key] ?? 0), 0),
      ),
    })),
  }
}

export function prepareNodeModulesSizeTable(input: ComparisonTableInput) {
  const columns: TableColumn[] = [
    frameworkColumn(),
    { key: 'value', header: input.yAxisLabel },
  ]
  if (input.data.some((row) => row.range))
    columns.push(
      { key: 'min', header: 'Minimum' },
      { key: 'max', header: 'Maximum' },
    )
  return {
    label: `${input.title} data`,
    columns,
    data: input.data.map((row) => ({
      name: row.name,
      value: formatChartValue(row.value, input.valueFormat),
      min: row.range ? formatChartValue(row.range.min, input.valueFormat) : '—',
      max: row.range ? formatChartValue(row.range.max, input.valueFormat) : '—',
    })),
  }
}

export function prepareServerRenderedFPTable(input: ComparisonTableInput) {
  const columns: TableColumn[] = [
    frameworkColumn(),
    { key: 'value', header: input.yAxisLabel },
  ]
  if (input.data.some((row) => row.range))
    columns.push(
      { key: 'min', header: 'Minimum' },
      { key: 'max', header: 'Maximum' },
    )
  return {
    label: `${input.title} data`,
    columns,
    data: input.data.map((row) => ({
      name: row.name,
      value: formatChartValue(row.value, input.valueFormat),
      min: row.range ? formatChartValue(row.range.min, input.valueFormat) : '—',
      max: row.range ? formatChartValue(row.range.max, input.valueFormat) : '—',
    })),
  }
}

export function prepareServerRenderedFCPTable(input: ComparisonTableInput) {
  const columns: TableColumn[] = [
    frameworkColumn(),
    { key: 'value', header: input.yAxisLabel },
  ]
  if (input.data.some((row) => row.range))
    columns.push(
      { key: 'min', header: 'Minimum' },
      { key: 'max', header: 'Maximum' },
    )
  return {
    label: `${input.title} data`,
    columns,
    data: input.data.map((row) => ({
      name: row.name,
      value: formatChartValue(row.value, input.valueFormat),
      min: row.range ? formatChartValue(row.range.min, input.valueFormat) : '—',
      max: row.range ? formatChartValue(row.range.max, input.valueFormat) : '—',
    })),
  }
}
