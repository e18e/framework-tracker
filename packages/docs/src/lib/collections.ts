import { getCollection } from 'astro:content'
import { formatBytesToMB, formatTimeMs } from './utils'

const devtimeEntries = await getCollection('devtime')
const runtimeEntries = await getCollection('runtime')

export const starterStats = devtimeEntries
  .map((entry) => entry.data)
  .sort((a, b) => a.order - b.order)

const ssrStats = runtimeEntries
  .map((entry) => entry.data)
  .sort((a, b) => a.order - b.order)

const depsStats = starterStats.map((f) => ({
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

const buildInstallData = starterStats.map((f) => ({
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

export { ssrStats, depsStats, buildInstallData }
