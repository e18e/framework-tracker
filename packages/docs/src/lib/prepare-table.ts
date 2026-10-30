import { prepareInitialLoadResources } from './initial-load'
import { formatChartValue } from './chart'
import { frameworks } from '@framework-tracker/results/frameworks'
import { getCollection } from 'astro:content'
import { formatBytesToMB, formatTimeMs, getFrameworkSlug } from './utils'

import type { CombinedResult } from '@framework-tracker/results/storage'
import { prepareStarterResult, prepareRuntimeResult } from './result-content'
const resultFiles = import.meta.glob<CombinedResult>(
  '../../../../results/**/latest.json',
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
      isFocused: true,
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
        Number.isFinite(framework[key].representativePeak.requestsPerSec) &&
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
        isFocused:
          framework.package === 'app-baseline-html'
            ? true
            : framework.isFocused,
        peakRequestsPerSec:
          framework[key]!.representativePeak.requestsPerSec.toLocaleString(),
        peakWorkers:
          framework[key]!.representativePeak.workers.toLocaleString(),
        worker25P99LatencyMs: `${worker25Stage.p99LatencyMs.toLocaleString(undefined, { maximumFractionDigits: 3 })}ms`,
        worker50P99LatencyMs: `${worker50Stage.p99LatencyMs.toLocaleString(undefined, { maximumFractionDigits: 3 })}ms`,
        worker100P99LatencyMs: `${worker100Stage.p99LatencyMs.toLocaleString(undefined, { maximumFractionDigits: 3 })}ms`,
        totalRequests: framework[key]!.totalRequests.toLocaleString(),
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
      isFocused: framework.isFocused,
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
      isFocused: framework.isFocused,
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
  isFocused: f.isFocused,
  directDependencies: [
    f.devDependencies.toLocaleString(),
    f.prodDependencies.toLocaleString(),
  ].join(' / '),
  prodDependencies: f.prodDependencies,
  devDependencies: f.devDependencies,
  allDependencies: f.allDependencies.toLocaleString(),
  duplicateDependencies: f.duplicateDependencies,
  nodeModulesSize: formatBytesToMB(f.install.nodeModulesSizeBytes),
  depInstallSize:
    f.depInstallSize != null ? formatBytesToMB(f.depInstallSize) : '—',
  graph: 'View',
}))

export const firstPartyDepsStats = starterStats.map((f) => {
  const dependencies = f.firstPartyDependencies

  return {
    name: f.name,
    package: f.package,
    isFocused: f.isFocused,
    directDependencies: [
      dependencies.devDependencies.toLocaleString(),
      dependencies.prodDependencies.toLocaleString(),
    ].join(' / '),
    allDependencies: dependencies.allDependencies.toLocaleString(),
    duplicateDependencies: dependencies.duplicateDependencies ?? '—',
    graph: 'View',
  }
})

export const minimumNodeVersionTableData = starterStats.map((f) => ({
  name: f.name,
  package: f.package,
  isFocused: f.isFocused,
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
      isFocused: f.isFocused,
      allDependencies: dependencies.allDependencies.toLocaleString(),
      devDependencies: dependencies.devDependencies.toLocaleString(),
      prodDependencies: dependencies.prodDependencies.toLocaleString(),
      graph: 'View',
      graphUrl: `https://npmgraph.js.org/?q=${encodeURIComponent(graphQuery)}`,
    },
  ]
})

export const buildInstallData = starterStats.map((f) => ({
  name: f.name,
  package: f.package,
  isFocused: f.isFocused,
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
  isFocused: f.isFocused,
  medianStart: formatTimeMs(f.devServerStartTime?.medianMs ?? Number.NaN),
  minStart: formatTimeMs(f.devServerStartTime?.minMs ?? Number.NaN),
  maxStart: formatTimeMs(f.devServerStartTime?.maxMs ?? Number.NaN),
}))

export const coreJsTableData = starterStats.map((f) => {
  const hasCorejs = (f.vendoredCoreJsSize ?? 0) > 0
  return {
    name: f.name,
    package: f.package,
    isFocused: f.isFocused,
    detected: f.vendoredCoreJsSize == null ? '—' : hasCorejs ? 'Yes' : 'No',
    bundledSize: hasCorejs
      ? `${((f.vendoredCoreJsSize ?? 0) / 1024).toFixed(1)} KB`
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
    isFocused: f.isFocused,
    status: formatBaselineStatus(
      baseline?.baselineStatus,
      baseline?.baselineFeatureCount,
    ),
    feature: formatBaselineReason(baseline?.baselineReason),
    year:
      baseline?.baselineFeatureCount === 0
        ? '—'
        : baseline?.baselineYear != null
          ? String(baseline.baselineYear)
          : '—',
    features:
      baseline?.baselineFeatureCount != null
        ? baseline.baselineFeatureCount.toLocaleString()
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
        isFocused: f.package === 'app-baseline-html' ? true : f.isFocused,
        opsPerSec: Math.round(tests.opsPerSec).toLocaleString(),
        latencyMs: `${Number(tests.latencyMs.toFixed(3))}ms`,
        bodySizeKb: `${tests.bodySizeKb}kb`,
        duplicationFactor: `${tests.duplicationFactor}x`,
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
        isFocused: framework.isFocused,
        requests: resources.total.requestCount,
        total: formatChartValue(resources.total.transferSize / 1024, 'kb'),
        ...Object.fromEntries(
          Object.entries(prepareInitialLoadResources(resources)).map(
            ([key, value]) => [key, formatChartValue(value, 'kb')],
          ),
        ),
      },
    ]
  },
)
