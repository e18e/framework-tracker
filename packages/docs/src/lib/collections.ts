import { getCollection } from 'astro:content'
import { formatBytesToMB, formatTimeMs } from './utils'

const devtimeEntries = await getCollection('devtime')
export const runtimeEntries = await getCollection('runtime')

export const starterStats = devtimeEntries
  .map((entry) => entry.data)
  .sort((a, b) => a.order - b.order)

export const ssrRequestThroughputStats = runtimeEntries
  .map((entry) => entry.data)
  .sort((a, b) => a.order - b.order)

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
