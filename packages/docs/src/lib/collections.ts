import { getCollection } from 'astro:content'
import { formatBytesToMB, formatTimeMs } from './utils'

const devtimeEntries = await getCollection('devtime')
const devtimeVersionEntries = await getCollection('devtimeVersions')
export const runtimeEntries = await getCollection('runtime')
const runtimeVersionEntries = await getCollection('runtimeVersions')
const cwvEntries = await getCollection('cwv')

type DevtimeVersionData = (typeof devtimeVersionEntries)[number]['data']
type RuntimeVersionData = (typeof runtimeVersionEntries)[number]['data']

function getVersionSortOrder(versions: string[]) {
  return new Map(versions.map((version, index) => [version, index]))
}

function compareVersionLabels(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

function getVersionedStats<
  T extends { package: string; frameworkVersion?: string },
>(
  entries: Array<{ data: T }>,
  packageName: string,
  versions?: string[],
) {
  const versionSortOrder =
    versions != null ? getVersionSortOrder(versions) : undefined

  return entries
    .map((entry) => entry.data)
    .filter(
      (entry) =>
        entry.package === packageName &&
        entry.frameworkVersion != null &&
        (versionSortOrder == null ||
          versionSortOrder.has(entry.frameworkVersion)),
    )
    .sort((a, b) =>
      versionSortOrder != null
        ? versionSortOrder.get(a.frameworkVersion!)! -
          versionSortOrder.get(b.frameworkVersion!)!
        : compareVersionLabels(a.frameworkVersion!, b.frameworkVersion!),
    )
}

export function getStarterVersionStats(
  packageName: string,
  versions?: string[],
): DevtimeVersionData[] {
  return getVersionedStats(devtimeVersionEntries, packageName, versions)
}

export function getRuntimeVersionStats(
  packageName: string,
  versions?: string[],
): RuntimeVersionData[] {
  return getVersionedStats(runtimeVersionEntries, packageName, versions)
}

export type Device = 'desktop' | 'mobile'

export const cwvStats = (device: Device) =>
  cwvEntries
    .map(({ data }) => ({
      id: data.id,
      framework: data.framework,
      isFocused: true,
      overallPercent: Math.floor(data.overall[device] * 100),
      lcpPercent: Math.floor(data.lcp[device] * 100),
      clsPercent: Math.floor(data.cls[device] * 100),
      fcpPercent: Math.floor(data.fcp[device] * 100),
      ttfbPercent: Math.floor(data.ttfb[device] * 100),
      inpPercent: Math.floor(data.inp[device] * 100),
    }))
    .sort((a, b) => b.overallPercent - a.overallPercent)

export type CWV = 'lcp' | 'cls' | 'fcp' | 'ttfb' | 'inp'

export function getCWVStatsChartData(cwv: CWV, device: Device) {
  return cwvStats(device)
    .sort((a, b) => b[`${cwv}Percent`] - a[`${cwv}Percent`])
    .map((stat) => ({
      name: stat.framework,
      value: stat[`${cwv}Percent`],
      focused: true,
    }))
}

export const starterStats = devtimeEntries
  .map((entry) => entry.data)
  .sort((a, b) => a.order - b.order)

export const ssrRequestThroughputStats = runtimeEntries
  .map((entry) => entry.data)
  .sort((a, b) => a.order - b.order)

type RuntimeData = (typeof runtimeEntries)[number]['data']

function getSSRLoadLatencyStage(framework: RuntimeData, workers: number) {
  return framework.ssrLoadTests?.stages.find(
    (stage) => stage.workers === workers,
  )
}

function getSSRLoadChartData(
  workers: number,
  percentile: 'p90LatencyMs' | 'p99LatencyMs',
) {
  return runtimeEntries
    .map((entry) => entry.data)
    .sort((a, b) => a.order - b.order)
    .filter((f) => {
      const stage = getSSRLoadLatencyStage(f, workers)
      return stage != null && Number.isFinite(stage[percentile])
    })
    .map((f) => ({
      name: f.name,
      value: getSSRLoadLatencyStage(f, workers)![percentile],
      focused: f.package === 'app-baseline-html' ? true : f.isFocused,
    }))
}

export const ssrLoadStats = runtimeEntries
  .map((entry) => entry.data)
  .filter(
    (framework) =>
      framework.ssrLoadTests != null &&
      Number.isFinite(framework.ssrLoadTests.peakRequestsPerSec) &&
      getSSRLoadLatencyStage(framework, 25) != null &&
      getSSRLoadLatencyStage(framework, 50) != null &&
      getSSRLoadLatencyStage(framework, 100) != null,
  )
  .sort((a, b) => a.order - b.order)
  .map((framework) => {
    const worker25Stage = getSSRLoadLatencyStage(framework, 25)!
    const worker50Stage = getSSRLoadLatencyStage(framework, 50)!
    const worker100Stage = getSSRLoadLatencyStage(framework, 100)!
    return {
      name: framework.name,
      package: framework.package,
      isFocused:
        framework.package === 'app-baseline-html' ? true : framework.isFocused,
      peakRequestsPerSec:
        framework.ssrLoadTests!.peakRequestsPerSec.toLocaleString(),
      peakWorkers: framework.ssrLoadTests!.peakWorkers.toLocaleString(),
      worker25P99LatencyMs: `${worker25Stage.p99LatencyMs}ms`,
      worker50P99LatencyMs: `${worker50Stage.p99LatencyMs}ms`,
      worker100P99LatencyMs: `${worker100Stage.p99LatencyMs}ms`,
      totalRequests: framework.ssrLoadTests!.totalRequests.toLocaleString(),
    }
  })

export const serverSideRenderedStats = runtimeEntries
  .map((entry) => entry.data)
  .sort((a, b) => a.order - b.order)
  .filter(
    (framework) =>
      framework.serverSideRenderedTests != null &&
      Number.isFinite(framework.serverSideRenderedTests.firstPaintMs),
  )
  .map((framework) => ({
    name: framework.name,
    package: framework.package,
    isFocused: framework.isFocused,
    firstPaintMs: `${framework.serverSideRenderedTests!.firstPaintMs}ms`,
    fcpMs: `${framework.serverSideRenderedTests!.fcpMs}ms`,
    inpMs: `${framework.serverSideRenderedTests!.inpMs}ms`,
  }))

export const clientSideRenderedStats = runtimeEntries
  .map((entry) => entry.data)
  .filter(
    (framework) =>
      framework.clientSideRenderedTests != null &&
      Number.isFinite(framework.clientSideRenderedTests.firstPaintMs),
  )
  .sort((a, b) => a.order - b.order)
  .map((framework) => ({
    name: framework.name,
    package: framework.package,
    isFocused: framework.isFocused,
    firstPaintMs: `${framework.clientSideRenderedTests!.firstPaintMs}ms`,
    fcpMs: `${framework.clientSideRenderedTests!.fcpMs}ms`,
    inpMs: `${framework.clientSideRenderedTests!.inpMs}ms`,
  }))

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
  nodeModulesSize: formatBytesToMB(f.nodeModulesSize),
  nodeModulesSizeProdOnly: formatBytesToMB(f.nodeModulesSizeProdOnly),
  depInstallSize:
    f.depInstallSize != null ? formatBytesToMB(f.depInstallSize) : '—',
  graph: 'View',
}))

export const buildInstallData = starterStats.map((f) => ({
  name: f.name,
  package: f.package,
  isFocused: f.isFocused,
  avgInstall: formatTimeMs(f.installTime.avgMs),
  minInstall: formatTimeMs(f.installTime.minMs),
  maxInstall: formatTimeMs(f.installTime.maxMs),
  avgColdBuild: formatTimeMs(f.coldBuildTime.avgMs),
  minColdBuild: formatTimeMs(f.coldBuildTime.minMs),
  maxColdBuild: formatTimeMs(f.coldBuildTime.maxMs),
  avgWarmBuild: formatTimeMs(f.warmBuildTime.avgMs),
  minWarmBuild: formatTimeMs(f.warmBuildTime.minMs),
  maxWarmBuild: formatTimeMs(f.warmBuildTime.maxMs),
  buildOutput: formatBytesToMB(f.buildOutputSize),
}))

export const chartDuplicateDependencyData = starterStats
  .filter((f) => Number.isFinite(f.duplicateDependencies))
  .map((f) => ({
    name: f.name,
    value: f.duplicateDependencies!,
    focused: f.isFocused,
  }))

export const chartSSRLoadWorker25P99LatencyData = getSSRLoadChartData(
  25,
  'p99LatencyMs',
)
export const chartSSRLoadWorker50P99LatencyData = getSSRLoadChartData(
  50,
  'p99LatencyMs',
)
export const chartSSRLoadWorker100P99LatencyData = getSSRLoadChartData(
  100,
  'p99LatencyMs',
)
export const chartSSRLoadWorker25P90LatencyData = getSSRLoadChartData(
  25,
  'p90LatencyMs',
)
export const chartSSRLoadWorker50P90LatencyData = getSSRLoadChartData(
  50,
  'p90LatencyMs',
)
export const chartSSRLoadWorker100P90LatencyData = getSSRLoadChartData(
  100,
  'p90LatencyMs',
)

export const chartServerSideRenderedFPData = runtimeEntries
  .map((entry) => entry.data)
  .sort((a, b) => a.order - b.order)
  .filter(
    (f) =>
      f.serverSideRenderedTests != null &&
      Number.isFinite(f.serverSideRenderedTests.firstPaintMs),
  )
  .map((f) => ({
    name: f.name,
    value: f.serverSideRenderedTests!.firstPaintMs,
    focused: f.isFocused,
  }))

export const chartServerSideRenderedFCPData = runtimeEntries
  .map((entry) => entry.data)
  .sort((a, b) => a.order - b.order)
  .filter(
    (f) =>
      f.serverSideRenderedTests != null &&
      Number.isFinite(f.serverSideRenderedTests.fcpMs),
  )
  .map((f) => ({
    name: f.name,
    value: f.serverSideRenderedTests!.fcpMs,
    focused: f.isFocused,
  }))

export const chartServerSideRenderedINPData = runtimeEntries
  .map((entry) => entry.data)
  .sort((a, b) => a.order - b.order)
  .filter(
    (f) =>
      f.serverSideRenderedTests != null &&
      Number.isFinite(f.serverSideRenderedTests.inpMs),
  )
  .map((f) => ({
    name: f.name,
    value: f.serverSideRenderedTests!.inpMs,
    focused: f.isFocused,
  }))

export const chartClientSideRenderedFPData = runtimeEntries
  .map((entry) => entry.data)
  .sort((a, b) => a.order - b.order)
  .filter(
    (f) =>
      f.clientSideRenderedTests != null &&
      Number.isFinite(f.clientSideRenderedTests.firstPaintMs),
  )
  .map((f) => ({
    name: f.name,
    value: f.clientSideRenderedTests!.firstPaintMs,
    focused: f.isFocused,
  }))

export const chartClientSideRenderedFCPData = runtimeEntries
  .map((entry) => entry.data)
  .sort((a, b) => a.order - b.order)
  .filter(
    (f) =>
      f.clientSideRenderedTests != null &&
      Number.isFinite(f.clientSideRenderedTests.fcpMs),
  )
  .map((f) => ({
    name: f.name,
    value: f.clientSideRenderedTests!.fcpMs,
    focused: f.isFocused,
  }))

export const chartClientSideRenderedINPData = runtimeEntries
  .map((entry) => entry.data)
  .sort((a, b) => a.order - b.order)
  .filter(
    (f) =>
      f.clientSideRenderedTests != null &&
      Number.isFinite(f.clientSideRenderedTests.inpMs),
  )
  .map((f) => ({
    name: f.name,
    value: f.clientSideRenderedTests!.inpMs,
    focused: f.isFocused,
  }))

export const coreJsTableData = starterStats.map((f) => {
  const hasCorejs = (f.vendoredCoreJsUnnecessaryModules?.length ?? 0) > 0
  return {
    name: f.name,
    package: f.package,
    isFocused: f.isFocused,
    bundledSize: hasCorejs
      ? `${((f.vendoredCoreJsSize ?? 0) / 1024).toFixed(1)} KB`
      : '—',
    unnecessaryModules: hasCorejs
      ? String(f.vendoredCoreJsUnnecessaryModules!.length)
      : '—',
  }
})

function formatBaselineStatus(
  status: 'high' | 'low' | false | null | undefined,
  featureCount: number | undefined,
) {
  if (featureCount === 0) return '—'
  if (status === 'high') return 'High'
  if (status === 'low') return 'Low'
  if (status === false) return 'Limited'
  return '—'
}

function formatBaselineReason(
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
