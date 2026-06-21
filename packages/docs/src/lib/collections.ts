import { getCollection } from 'astro:content'
import { formatBytesToMB, formatTimeMs } from './utils'

const devtimeEntries = await getCollection('devtime')
export const runtimeEntries = await getCollection('runtime')

export const starterStats = devtimeEntries
  .map((entry) => entry.data)
  .sort((a, b) => a.order - b.order)

export const ssrStats = runtimeEntries
  .map((entry) => entry.data)
  .sort((a, b) => a.order - b.order)

export const mpaStats = runtimeEntries
  .map((entry) => entry.data)
  .sort((a, b) => a.order - b.order)
  .filter((f) => f?.name != null && Number.isFinite(f.mpaFirstPaintMs))
  .map((f) => ({
    name: f.name,
    package: f.package,
    isFocused: f.isFocused,
    mpaFirstPaintMs: `${f.mpaFirstPaintMs}ms`,
    mpaFCPMs: `${f.mpaFCPMs}ms`,
    mpaINPMs: `${f.mpaINPMs}ms`,
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

export const chartMPAFPData = runtimeEntries
  .map((entry) => entry.data)
  .sort((a, b) => a.order - b.order)
  .filter((f) => f?.name != null && Number.isFinite(f.mpaFirstPaintMs))
  .map((f) => ({
    name: f.name,
    value: f.mpaFirstPaintMs!,
    focused: f.isFocused,
  }))

export const chartMPAFCPData = runtimeEntries
  .map((entry) => entry.data)
  .sort((a, b) => a.order - b.order)
  .filter((f) => f?.name != null && Number.isFinite(f.mpaFCPMs))
  .map((f) => ({ name: f.name, value: f.mpaFCPMs!, focused: f.isFocused }))

export const chartMPAINPData = runtimeEntries
  .map((entry) => entry.data)
  .sort((a, b) => a.order - b.order)
  .filter((f) => f?.name != null && Number.isFinite(f.mpaINPMs))
  .map((f) => ({ name: f.name, value: f.mpaINPMs!, focused: f.isFocused }))

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
