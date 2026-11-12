import { INTERACTION_PHASES } from './interaction-phases'
import { stackGrays } from './chart-styles'
import { prepareInitialLoadResources } from './initial-load'
import { getCollection } from 'astro:content'
import { frameworks } from '@framework-performance/results/frameworks'
export * from './chart-measurements'
import type { CombinedResult } from '@framework-performance/results/storage'
import { prepareRuntimeResult, prepareStarterResult } from './result-content'
import type { ChartMeasurement, StackedAreaChartPayload } from './types'

const resultFiles = import.meta.glob<CombinedResult>(
  '../../../results/data/**/*.json',
  { eager: true, import: 'default' },
)
const latest = Object.entries(resultFiles)
  .filter(([path]) => path.endsWith('/latest.json'))
  .map(([, result]) => result)
  .sort(
    (a, b) =>
      frameworks.findIndex((f) => f.name === a.framework) -
      frameworks.findIndex((f) => f.name === b.framework),
  )
const history = Object.entries(resultFiles)
  .filter(([path]) => path.includes('/versions/'))
  .map(([, result]) => result)
export const starterStats = latest
  .filter((result) => result.projects.starter)
  .map(prepareStarterResult)
export const ssrRequestThroughputStats = latest
  .filter((result) => result.projects.app)
  .map(prepareRuntimeResult)
export const starterHistory = history
  .filter((result) => result.projects.starter)
  .map(prepareStarterResult)
export const runtimeHistory = history
  .filter((result) => result.projects.app)
  .map(prepareRuntimeResult)
type DevtimeVersionData = (typeof starterHistory)[number]
type RuntimeVersionData = (typeof runtimeHistory)[number]

function getVersionSortOrder(versions: string[]) {
  return new Map(versions.map((version, index) => [version, index]))
}

function compareVersionLabels(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

function getVersionedStats<
  T extends { package: string; frameworkVersion?: string },
>(entries: T[], packageName: string, versions?: string[]) {
  const versionSortOrder =
    versions != null ? getVersionSortOrder(versions) : undefined

  return entries
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
  return getVersionedStats(starterHistory, packageName, versions)
}

export function getRuntimeVersionStats(
  packageName: string,
  versions?: string[],
): RuntimeVersionData[] {
  return getVersionedStats(runtimeHistory, packageName, versions)
}

type RenderedTestsKey = 'clientSideRendered' | 'serverSideRendered'
export function getRenderedInteractionBreakdownData(
  testsKey: RenderedTestsKey,
) {
  return ssrRequestThroughputStats.flatMap((framework) => {
    const interaction = framework[testsKey]?.interactionTests
    if (interaction == null) return []

    return {
      name: framework.name,
      interactionLatency: interaction.interactionLatency,
      values: Object.fromEntries(
        INTERACTION_PHASES.map(({ key }) => [key, interaction[key]]),
      ),
    }
  })
}

export type CWV = 'lcp' | 'cls' | 'fcp' | 'ttfb' | 'inp'

export function getCWVStatsChartData(cwv: CWV, device: Device) {
  return cwvEntries
    .map(({ data }) => ({
      name: data.name,
      lcpPercent: Math.floor(data.lcp[device] * 100),
      clsPercent: Math.floor(data.cls[device] * 100),
      fcpPercent: Math.floor(data.fcp[device] * 100),
      ttfbPercent: Math.floor(data.ttfb[device] * 100),
      inpPercent: Math.floor(data.inp[device] * 100),
    }))
    .sort((a, b) => b[`${cwv}Percent`] - a[`${cwv}Percent`])
    .map((stat) => ({
      name: stat.name,
      value: stat[`${cwv}Percent`],
    }))
}

const cwvEntries = await getCollection('cwv')
export type Device = 'desktop' | 'mobile'

export const initialLoadSeries = [
  { key: 'html', label: 'HTML', color: stackGrays[0] },
  { key: 'css', label: 'CSS', color: stackGrays[1] },
  { key: 'js', label: 'JavaScript', color: stackGrays[2] },
  { key: 'other', label: 'Other', color: stackGrays[3] },
]

export const initialLoadChartData = ssrRequestThroughputStats.flatMap(
  (framework) => {
    const resources = framework.initialLoad?.resources
    if (!resources) return []
    return [
      {
        name: framework.name,
        requests: resources.total.requestCount.value,
        total: resources.total.transferSize.value / 1024,
        values: prepareInitialLoadResources(resources),
      },
    ]
  },
)

export type DependencySource =
  'frameworkDependencies' | 'firstPartyDependencies'

const dependencySeries = [
  { key: 'prod', label: 'Production', color: stackGrays[0] },
  { key: 'dev', label: 'Development', color: stackGrays[1] },
]

export function prepareDependencyStackedChart(source?: DependencySource) {
  const data = starterStats.flatMap((framework) => {
    const dependencies = source ? framework[source] : framework
    const prod = dependencies?.productionDependencyCount?.value
    const dev = dependencies?.developmentDependencyCount?.value
    if (
      prod == null ||
      !Number.isFinite(prod) ||
      dev == null ||
      !Number.isFinite(dev)
    )
      return []
    return [{ name: framework.name, values: { prod, dev } }]
  })
  return { series: dependencySeries, data, valueFormat: 'count' as const }
}

export function prepareDependencyHistoryChart(
  versions: readonly ChartMeasurement[],
  source?: DependencySource,
): Omit<StackedAreaChartPayload, 'title'> {
  const data = versions.flatMap((version) => {
    const counts = source ? version[source] : version
    const prod = counts?.productionDependencyCount?.value
    const dev = counts?.developmentDependencyCount?.value
    if (
      prod == null ||
      dev == null ||
      !Number.isFinite(prod) ||
      !Number.isFinite(dev)
    )
      return []
    return [
      {
        name: version.frameworkVersion ?? 'Unknown',
        values: { prod, dev },
        total: counts?.totalDependencyCount?.value ?? null,
      },
    ]
  })
  return {
    data,
    series: dependencySeries,
    valueFormat: 'count',
    yAxisLabel: 'Dependencies',
    totalLabel: 'Measured total',
  }
}
