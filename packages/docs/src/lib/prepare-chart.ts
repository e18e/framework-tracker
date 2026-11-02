import { prepareInitialLoadResources } from './initial-load'
import { getCollection } from 'astro:content'
import { frameworks } from '@framework-tracker/results/frameworks'
export * from './chart-measurements'
import type { CombinedResult } from '@framework-tracker/results/storage'
import { prepareRuntimeResult, prepareStarterResult } from './result-content'

const resultFiles = import.meta.glob<CombinedResult>(
  '../../../../results/**/*.json',
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
const starterHistory = history
  .filter((result) => result.projects.starter)
  .map(prepareStarterResult)
const runtimeHistory = history
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

type RenderedTestsKey = 'clientSideRenderedTests' | 'serverSideRenderedTests'
export function getRenderedInteractionBreakdownData(
  testsKey: RenderedTestsKey,
) {
  return ssrRequestThroughputStats.flatMap((framework) => {
    const interaction = framework[testsKey]?.interactionTests
    if (interaction == null) return []

    return {
      name: framework.name,
      focused: framework.isFocused,
      ...interaction,
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
      focused: true,
    }))
}

const cwvEntries = await getCollection('cwv')
export type Device = 'desktop' | 'mobile'

export const initialLoadSeries = [
  { key: 'html', label: 'HTML', color: '#e34c26' },
  { key: 'css', label: 'CSS', color: '#1572b6' },
  { key: 'js', label: 'JavaScript', color: '#f7df1e' },
  { key: 'other', label: 'Other', color: 'var(--ft-muted)' },
]

export const initialLoadChartData = ssrRequestThroughputStats.flatMap(
  (framework) => {
    const resources = framework.initialLoadTests?.resources
    if (!resources) return []
    return [
      {
        name: framework.name,
        focused: framework.isFocused,
        requests: resources.total.requestCount,
        total: resources.total.transferSize / 1024,
        values: prepareInitialLoadResources(resources),
      },
    ]
  },
)
