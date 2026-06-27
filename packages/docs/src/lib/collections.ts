import { getCollection } from 'astro:content'
import { formatBytesToMB, formatTimeMs } from './utils'

const devtimeEntries = await getCollection('devtime')
export const runtimeEntries = await getCollection('runtime')
const cwvEntries = await getCollection('cwv')

export const cwvStats = cwvEntries
  .map(entry => entry.data)
  .sort((a, b) => a.overall.desktop - b.overall.desktop)
  .map(stat => ({
    id: stat.id,
    framework: stat.framework,
    isFocused: true,
    lcpDesktopPercent: Math.floor(stat.lcp.desktop * 100),
    lcpMobilePercent: Math.floor(stat.lcp.mobile * 100),
    clsDesktopPercent: Math.floor(stat.cls.desktop * 100),
    clsMobilePercent: Math.floor(stat.cls.mobile * 100),
    fcpDesktopPercent: Math.floor(stat.fcp.desktop * 100),
    fcpMobilePercent: Math.floor(stat.fcp.mobile * 100),
    ttfbDesktopPercent: Math.floor(stat.ttfb.desktop * 100),
    ttfbMobilePercent: Math.floor(stat.ttfb.mobile * 100),
    inpDesktopPercent: Math.floor(stat.inp.desktop * 100),
    inpMobilePercent: Math.floor(stat.inp.mobile * 100)
  }))

export type CWV = 'lcp' | 'cls' | 'fcp' | 'ttfb' | 'inp'

export function getCWVDesktopStatsChartData(cwv: CWV) {
  return cwvStats
    .sort((a, b) => a[`${cwv}DesktopPercent`] - b[`${cwv}DesktopPercent`])
    .map(stat => ({
      name: stat.framework,
      value: stat[`${cwv}DesktopPercent`],
      focused: true
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
  prodDependencies: f.prodDependencies,
  devDependencies: f.devDependencies,
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
