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
  nodeModulesSize: formatBytesToMB(f.nodeModulesSize),
  nodeModulesSizeProdOnly: formatBytesToMB(f.nodeModulesSizeProdOnly),
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
  avgWarmBuild: formatTimeMs(f.warmBuildTime.avgMs),
  buildOutput: formatBytesToMB(f.buildOutputSize),
}))

export { ssrStats, depsStats, buildInstallData }
