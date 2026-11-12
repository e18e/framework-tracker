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

export type SSRLoadKey = 'ssrLoad' | 'ssrRouterLinkLoad'

function getSSRLoadLatencyStage(
  framework: RuntimeData,
  connections: number,
  key: SSRLoadKey = 'ssrLoad',
) {
  return framework[key]?.stages.find(
    (stage) => stage.connections === connections,
  )
}

export const getSSRLoadStats = (key: SSRLoadKey = 'ssrLoad') =>
  ssrRequestThroughputStats
    .filter(
      (framework) =>
        framework[key] != null &&
        Number.isFinite(
          framework[key].representativePeak.requestThroughput.value,
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
          ]!.representativePeak.requestThroughput.value.toLocaleString(),
        peakWorkers:
          framework[key]!.representativePeak.connections.toLocaleString(),
        worker25P99LatencyMs: `${worker25Stage.p99Latency.toLocaleString(undefined, { maximumFractionDigits: 3 })}ms`,
        worker50P99LatencyMs: `${worker50Stage.p99Latency.toLocaleString(undefined, { maximumFractionDigits: 3 })}ms`,
        worker100P99LatencyMs: `${worker100Stage.p99Latency.toLocaleString(undefined, { maximumFractionDigits: 3 })}ms`,
        totalRequestCount:
          framework[key]!.totalRequestCount.value.toLocaleString(),
      }
    })

export const serverSideRenderedStats = ssrRequestThroughputStats
  .filter(
    (framework) =>
      framework.serverSideRendered != null &&
      Number.isFinite(framework.serverSideRendered.firstPaint),
  )
  .map((framework) => {
    const tests = framework.serverSideRendered!
    const interaction = tests.interactionTests

    return {
      name: framework.name,
      package: framework.package,
      firstPaint: formatMilliseconds(tests.firstPaint),
      fcp: formatMilliseconds(tests.firstContentfulPaint),
      interactionLatency: formatMilliseconds(interaction?.interactionLatency),
      inputDelay: formatMilliseconds(interaction?.inputDelay),
      processingDuration: formatMilliseconds(interaction?.processingDuration),
      presentationDelay: formatMilliseconds(interaction?.presentationDelay),
    }
  })

export const clientSideRenderedStats = ssrRequestThroughputStats
  .filter(
    (framework) =>
      framework.clientSideRendered != null &&
      Number.isFinite(framework.clientSideRendered.firstPaint),
  )
  .map((framework) => {
    const tests = framework.clientSideRendered!
    const interaction = tests.interactionTests

    return {
      name: framework.name,
      package: framework.package,
      firstPaint: formatMilliseconds(tests.firstPaint),
      fcp: formatMilliseconds(tests.firstContentfulPaint),
      interactionLatency: formatMilliseconds(interaction?.interactionLatency),
      inputDelay: formatMilliseconds(interaction?.inputDelay),
      processingDuration: formatMilliseconds(interaction?.processingDuration),
      presentationDelay: formatMilliseconds(interaction?.presentationDelay),
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
    f.developmentDependencyCount.value.toLocaleString(),
    f.productionDependencyCount.value.toLocaleString(),
  ].join(' / '),
  productionDependencyCount: f.productionDependencyCount.value,
  developmentDependencyCount: f.developmentDependencyCount.value,
  totalDependencyCount: f.totalDependencyCount.value.toLocaleString(),
  duplicateDependencyCount: f.duplicateDependencyCount?.value,
  nodeModulesSize: formatBytesToMB(f.install.nodeModulesSize.value),
  dependencyInstallSize:
    f.dependencyInstallSize != null
      ? formatBytesToMB(f.dependencyInstallSize.value)
      : '—',
  graph: 'View',
}))

export const firstPartyDepsStats = starterStats.map((f) => {
  const dependencies = f.firstPartyDependencies

  return {
    name: f.name,
    package: f.package,
    directDependencies: [
      dependencies.developmentDependencyCount.value.toLocaleString(),
      dependencies.productionDependencyCount.value.toLocaleString(),
    ].join(' / '),
    totalDependencyCount:
      dependencies.totalDependencyCount.value.toLocaleString(),
    duplicateDependencyCount:
      dependencies.duplicateDependencyCount?.value ?? '—',
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
      totalDependencyCount:
        dependencies.totalDependencyCount.value.toLocaleString(),
      developmentDependencyCount:
        dependencies.developmentDependencyCount.value.toLocaleString(),
      productionDependencyCount:
        dependencies.productionDependencyCount.value.toLocaleString(),
      graph: 'View',
      graphUrl: `https://npmgraph.js.org/?q=${encodeURIComponent(graphQuery)}`,
    },
  ]
})

export const buildInstallData = starterStats.map((f) => ({
  name: f.name,
  package: f.package,
  medianInstall: formatTimeMs(f.install.duration.median),
  minInstall: formatTimeMs(f.install.duration.min),
  maxInstall: formatTimeMs(f.install.duration.max),
  medianColdBuild: formatTimeMs(f.coldBuild.medianMs),
  minColdBuild: formatTimeMs(f.coldBuild.minMs),
  maxColdBuild: formatTimeMs(f.coldBuild.maxMs),
  medianWarmBuild: formatTimeMs(f.warmBuild.medianMs),
  minWarmBuild: formatTimeMs(f.warmBuild.minMs),
  maxWarmBuild: formatTimeMs(f.warmBuild.maxMs),
}))

export const devServerStartData = starterStats.map((f) => ({
  name: f.name,
  package: f.package,
  medianStart: formatTimeMs(f.devServer?.medianMs ?? Number.NaN),
  minStart: formatTimeMs(f.devServer?.minMs ?? Number.NaN),
  maxStart: formatTimeMs(f.devServer?.maxMs ?? Number.NaN),
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
  const baseline = f.browserBaseline
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
    const tests = f.ssrRequestThroughput
    if (!tests) return []
    return [
      {
        name: f.name,
        package: f.package,
        requestThroughput: Math.round(tests.requestThroughput).toLocaleString(),
        latency: `${Number(tests.latency.toFixed(3))}${tests.latencyUnit}`,
        bodySize: `${tests.bodySize.value} ${tests.bodySize.unit}`,
        duplicationFactor: `${tests.duplicationFactor.value}x`,
      },
    ]
  },
)

export const initialLoadTableData = ssrRequestThroughputStats.flatMap(
  (framework) => {
    const resources = framework.initialLoad?.resources
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
