import { INTERACTION_PHASES } from './interaction-phases.ts'
import { metricCatalogue } from './metrics.ts'
import { monthlyComparison, seriesIdentity } from './monthly-history.ts'
import type {
  ChartMeasurement,
  InteractionHistoryDatum,
  InteractionTimings,
  InstallChartMeasurement,
  MetricDefinition,
  LineComparisonChartPayload,
  PreparedComparisonChart,
  VersionLineChartPayload,
} from './types'

type Measurement = { record: ChartMeasurement; value: number | null }

function finiteValue(value: number | undefined, divisor = 1): number | null {
  return value != null && Number.isFinite(value)
    ? Math.max(0, value / divisor)
    : null
}

function history(
  metric: MetricDefinition,
  measurements: Measurement[],
): VersionLineChartPayload {
  return {
    ...metric,
    data: measurements.map(({ record, value }) => ({
      id: `${record.package ?? 'unknown'}:${record.frameworkVersion ?? 'Unknown'}`,
      name: record.frameworkVersion ?? 'Unknown',
      value,
    })),
  }
}

function comparisonRange(record: ChartMeasurement, metric: MetricDefinition) {
  const source = record as unknown as Record<
    string,
    Record<string, unknown> | undefined
  >
  const [group, field] = metric.id.split('.')
  const container = source[group === 'installTime' ? 'install' : group!]
  const raw =
    group === 'installTime'
      ? container?.installTimeMs
      : (container?.[`${field}Range`] ?? container?.[field!])
  const summary =
    field === 'medianMs' && group !== 'installTime'
      ? {
          min: container?.minMs,
          median: container?.medianMs,
          max: container?.maxMs,
        }
      : raw
  if (typeof summary !== 'object' || summary == null) return undefined
  const r = summary as { min: number; median: number; max: number }
  if (![r.min, r.median, r.max].every(Number.isFinite)) return undefined
  const divisor = metric.valueFormat === 's' ? 1000 : 1
  return {
    min: r.min / divisor,
    median: r.median / divisor,
    max: r.max / divisor,
  }
}

function comparison(
  metric: MetricDefinition,
  measurements: Measurement[],
  sortOrder: 'ascending' | 'descending' = 'ascending',
): PreparedComparisonChart {
  return {
    ...metric,
    data: measurements
      .flatMap(({ record, value }) =>
        value == null
          ? []
          : [
              {
                id: record.package ?? record.name ?? '',
                name: record.name ?? '',
                value,
                range: comparisonRange(record, metric),

                version: record.frameworkVersion,
              },
            ],
      )
      .sort(
        (a, b) =>
          (sortOrder === 'descending'
            ? b.value - a.value
            : a.value - b.value) || a.name.localeCompare(b.name),
      ),
  }
}

export function prepareDevServerStartTimeHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['devServerStartTime.medianMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.devServerStartTime?.medianMs, 1000),
    })),
  )
}

export function prepareDevServerStartTimeComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['devServerStartTime.medianMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.devServerStartTime?.medianMs, 1000),
    })),
  )
}

export function prepareDevServerStartTimeMonthlyComparison(
  history: readonly ChartMeasurement[],
  latest: readonly ChartMeasurement[],
  now?: Date,
): LineComparisonChartPayload {
  return monthlyComparison(
    metricCatalogue['devServerStartTime.medianMs'],
    history,
    latest,
    (record) => finiteValue(record.devServerStartTime?.medianMs, 1000),
    now,
  )
}

export function prepareFrameworkDependenciesProdDependenciesHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['frameworkDependencies.prodDependencies'],
    records.map((record) => ({
      record,
      value: finiteValue(record.frameworkDependencies?.prodDependencies?.value),
    })),
  )
}

export function prepareFrameworkDependenciesDevDependenciesHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['frameworkDependencies.devDependencies'],
    records.map((record) => ({
      record,
      value: finiteValue(record.frameworkDependencies?.devDependencies?.value),
    })),
  )
}

export function prepareFrameworkDependenciesAllDependenciesHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['frameworkDependencies.allDependencies'],
    records.map((record) => ({
      record,
      value: finiteValue(record.frameworkDependencies?.allDependencies?.value),
    })),
  )
}

export function prepareProdDependenciesHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['prodDependencies'],
    records.map((record) => ({
      record,
      value: finiteValue(record.prodDependencies?.value),
    })),
  )
}

export function prepareProdDependenciesComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['prodDependencies'],
    records.map((record) => ({
      record,
      value: finiteValue(record.prodDependencies?.value),
    })),
  )
}

export function prepareProdDependenciesMonthlyComparison(
  history: readonly ChartMeasurement[],
  latest: readonly ChartMeasurement[],
  now?: Date,
): LineComparisonChartPayload {
  return monthlyComparison(
    metricCatalogue['prodDependencies'],
    history,
    latest,
    (record) => finiteValue(record.prodDependencies?.value),
    now,
  )
}

export function prepareDevDependenciesHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['devDependencies'],
    records.map((record) => ({
      record,
      value: finiteValue(record.devDependencies?.value),
    })),
  )
}

export function prepareDevDependenciesComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['devDependencies'],
    records.map((record) => ({
      record,
      value: finiteValue(record.devDependencies?.value),
    })),
  )
}

export function prepareDevDependenciesMonthlyComparison(
  history: readonly ChartMeasurement[],
  latest: readonly ChartMeasurement[],
  now?: Date,
): LineComparisonChartPayload {
  return monthlyComparison(
    metricCatalogue['devDependencies'],
    history,
    latest,
    (record) => finiteValue(record.devDependencies?.value),
    now,
  )
}

export function prepareAllDependenciesHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['allDependencies'],
    records.map((record) => ({
      record,
      value: finiteValue(record.allDependencies?.value),
    })),
  )
}

export function prepareDuplicateDependenciesHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['duplicateDependencies'],
    records.map((record) => ({
      record,
      value: finiteValue(record.duplicateDependencies?.value),
    })),
  )
}

export function prepareDuplicateDependenciesComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['duplicateDependencies'],
    records.map((record) => ({
      record,
      value: finiteValue(record.duplicateDependencies?.value),
    })),
  )
}

export function prepareDuplicateDependenciesMonthlyComparison(
  history: readonly ChartMeasurement[],
  latest: readonly ChartMeasurement[],
  now?: Date,
): LineComparisonChartPayload {
  return monthlyComparison(
    metricCatalogue['duplicateDependencies'],
    history,
    latest,
    (record) => finiteValue(record.duplicateDependencies?.value),
    now,
  )
}

export function prepareLighthouseClientSideRenderedTestsFirstPaintMsHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['clientSideRenderedTests.firstPaintMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.clientSideRenderedTests?.firstPaintMs),
    })),
  )
}

export function prepareLighthouseClientSideRenderedTestsFirstPaintMsComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['clientSideRenderedTests.firstPaintMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.clientSideRenderedTests?.firstPaintMs),
    })),
  )
}

export function prepareLighthouseClientSideRenderedTestsFirstPaintMsMonthlyComparison(
  history: readonly ChartMeasurement[],
  latest: readonly ChartMeasurement[],
  now?: Date,
): LineComparisonChartPayload {
  return monthlyComparison(
    metricCatalogue['clientSideRenderedTests.firstPaintMs'],
    history,
    latest,
    (record) => finiteValue(record.clientSideRenderedTests?.firstPaintMs),
    now,
  )
}

export function prepareLighthouseClientSideRenderedTestsFcpMsHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['clientSideRenderedTests.fcpMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.clientSideRenderedTests?.fcpMs),
    })),
  )
}

export function prepareLighthouseClientSideRenderedTestsFcpMsComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['clientSideRenderedTests.fcpMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.clientSideRenderedTests?.fcpMs),
    })),
  )
}

const INTERACTION_KEYS = [
  'interactionLatencyMs',
  ...INTERACTION_PHASES.map(({ key }) => key),
] as const

function hasInteractionTimings(
  timings: InteractionTimings | undefined,
): timings is Required<InteractionTimings> {
  return (
    timings != null &&
    INTERACTION_KEYS.every((key) => finiteValue(timings[key]) != null)
  )
}

function interactionHistory(
  records: readonly ChartMeasurement[],
  testsKey: 'clientSideRenderedTests' | 'serverSideRenderedTests',
): InteractionHistoryDatum[] {
  return records.flatMap((record) => {
    const timings = record[testsKey]?.interactionTests
    if (!hasInteractionTimings(timings)) return []

    const version = record.frameworkVersion ?? 'Unknown'
    return {
      id: `${record.package ?? 'unknown'}:${version}`,
      name: `v${version}`,
      interactionLatencyMs: timings.interactionLatencyMs,
      inputDelayMs: timings.inputDelayMs,
      processingDurationMs: timings.processingDurationMs,
      presentationDelayMs: timings.presentationDelayMs,
    }
  })
}

export function prepareLighthouseClientSideRenderedTestsInteractionHistory(
  records: readonly ChartMeasurement[],
): InteractionHistoryDatum[] {
  return interactionHistory(records, 'clientSideRenderedTests')
}

export function prepareLighthouseServerSideRenderedTestsInteractionHistory(
  records: readonly ChartMeasurement[],
): InteractionHistoryDatum[] {
  return interactionHistory(records, 'serverSideRenderedTests')
}

export function prepareLighthouseClientSideRenderedTestsFcpMsMonthlyComparison(
  history: readonly ChartMeasurement[],
  latest: readonly ChartMeasurement[],
  now?: Date,
): LineComparisonChartPayload {
  return monthlyComparison(
    metricCatalogue['clientSideRenderedTests.fcpMs'],
    history,
    latest,
    (record) => finiteValue(record.clientSideRenderedTests?.fcpMs),
    now,
  )
}

export function prepareInstallTimeHistory(
  records: readonly InstallChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['installTime.medianMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.install.installTimeMs.median, 1000),
    })),
  )
}

export function prepareInstallTimeComparison(
  records: readonly InstallChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['installTime.medianMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.install.installTimeMs.median, 1000),
    })),
  )
}

export function prepareInstallTimeMonthlyComparison(
  history: readonly ChartMeasurement[],
  latest: readonly ChartMeasurement[],
  now?: Date,
): LineComparisonChartPayload {
  return monthlyComparison(
    metricCatalogue['installTime.medianMs'],
    history,
    latest,
    (record) => finiteValue(record.install?.installTimeMs?.mean, 1000),
    now,
  )
}

export function prepareColdBuildTimeHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['coldBuildTime.medianMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.coldBuildTime?.medianMs, 1000),
    })),
  )
}

export function prepareColdBuildTimeComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['coldBuildTime.medianMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.coldBuildTime?.medianMs, 1000),
    })),
  )
}

export function prepareColdBuildTimeMonthlyComparison(
  history: readonly ChartMeasurement[],
  latest: readonly ChartMeasurement[],
  now?: Date,
): LineComparisonChartPayload {
  return monthlyComparison(
    metricCatalogue['coldBuildTime.medianMs'],
    history,
    latest,
    (record) => finiteValue(record.coldBuildTime?.medianMs, 1000),
    now,
  )
}

export function prepareWarmBuildTimeHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['warmBuildTime.medianMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.warmBuildTime?.medianMs, 1000),
    })),
  )
}

export function prepareWarmBuildTimeComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['warmBuildTime.medianMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.warmBuildTime?.medianMs, 1000),
    })),
  )
}

export function prepareWarmBuildTimeMonthlyComparison(
  history: readonly ChartMeasurement[],
  latest: readonly ChartMeasurement[],
  now?: Date,
): LineComparisonChartPayload {
  return monthlyComparison(
    metricCatalogue['warmBuildTime.medianMs'],
    history,
    latest,
    (record) => finiteValue(record.warmBuildTime?.medianMs, 1000),
    now,
  )
}

export function prepareCoreJsSizeHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['vendoredCoreJsSize'],
    records.map((record) => ({
      record,
      value: finiteValue(record.vendoredCoreJsSize?.value, 1024),
    })),
  )
}

export function prepareLighthouseServerSideRenderedTestsFirstPaintMsHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['serverSideRenderedTests.firstPaintMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.serverSideRenderedTests?.firstPaintMs),
    })),
  )
}

export function prepareLighthouseServerSideRenderedTestsFirstPaintMsComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['serverSideRenderedTests.firstPaintMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.serverSideRenderedTests?.firstPaintMs),
    })),
  )
}

export function prepareLighthouseServerSideRenderedTestsFirstPaintMsMonthlyComparison(
  history: readonly ChartMeasurement[],
  latest: readonly ChartMeasurement[],
  now?: Date,
): LineComparisonChartPayload {
  return monthlyComparison(
    metricCatalogue['serverSideRenderedTests.firstPaintMs'],
    history,
    latest,
    (record) => finiteValue(record.serverSideRenderedTests?.firstPaintMs),
    now,
  )
}

export function prepareLighthouseServerSideRenderedTestsFcpMsHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['serverSideRenderedTests.fcpMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.serverSideRenderedTests?.fcpMs),
    })),
  )
}

export function prepareLighthouseServerSideRenderedTestsFcpMsComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['serverSideRenderedTests.fcpMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.serverSideRenderedTests?.fcpMs),
    })),
  )
}

export function prepareLighthouseServerSideRenderedTestsFcpMsMonthlyComparison(
  history: readonly ChartMeasurement[],
  latest: readonly ChartMeasurement[],
  now?: Date,
): LineComparisonChartPayload {
  return monthlyComparison(
    metricCatalogue['serverSideRenderedTests.fcpMs'],
    history,
    latest,
    (record) => finiteValue(record.serverSideRenderedTests?.fcpMs),
    now,
  )
}

export function prepareSsrRequestThroughputTestsOpsPerSecHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['ssrRequestThroughputTests.opsPerSec'],
    records.map((record) => ({
      record,
      value: finiteValue(record.ssrRequestThroughputTests?.opsPerSec),
    })),
  )
}

export function prepareSsrRequestThroughputTestsOpsPerSecComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['ssrRequestThroughputTests.opsPerSec'],
    records.map((record) => ({
      record,
      value: finiteValue(record.ssrRequestThroughputTests?.opsPerSec),
    })),
    'descending',
  )
}

export function prepareSsrRequestThroughputTestsOpsPerSecMonthlyComparison(
  history: readonly ChartMeasurement[],
  latest: readonly ChartMeasurement[],
  now?: Date,
): LineComparisonChartPayload {
  return monthlyComparison(
    metricCatalogue['ssrRequestThroughputTests.opsPerSec'],
    history,
    latest,
    (record) => finiteValue(record.ssrRequestThroughputTests?.opsPerSec),
    now,
  )
}

export function prepareSsrRequestThroughputTestsBodySizeKbHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['ssrRequestThroughputTests.bodySizeKb'],
    records.map((record) => ({
      record,
      value: finiteValue(record.ssrRequestThroughputTests?.bodySizeKb?.value),
    })),
  )
}

export function prepareSsrRequestThroughputTestsBodySizeKbComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['ssrRequestThroughputTests.bodySizeKb'],
    records.map((record) => ({
      record,
      value: finiteValue(record.ssrRequestThroughputTests?.bodySizeKb?.value),
    })),
  )
}

export function prepareSsrRequestThroughputTestsBodySizeKbMonthlyComparison(
  history: readonly ChartMeasurement[],
  latest: readonly ChartMeasurement[],
  now?: Date,
): LineComparisonChartPayload {
  return monthlyComparison(
    metricCatalogue['ssrRequestThroughputTests.bodySizeKb'],
    history,
    latest,
    (record) =>
      finiteValue(record.ssrRequestThroughputTests?.bodySizeKb?.value),
    now,
  )
}

export function prepareSsrRequestThroughputTestsLatencyMsHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['ssrRequestThroughputTests.latencyMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.ssrRequestThroughputTests?.latencyMs),
    })),
  )
}

export function prepareSsrRequestThroughputTestsLatencyMsComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['ssrRequestThroughputTests.latencyMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.ssrRequestThroughputTests?.latencyMs),
    })),
  )
}

export function prepareSsrRequestThroughputTestsLatencyMsMonthlyComparison(
  history: readonly ChartMeasurement[],
  latest: readonly ChartMeasurement[],
  now?: Date,
): LineComparisonChartPayload {
  return monthlyComparison(
    metricCatalogue['ssrRequestThroughputTests.latencyMs'],
    history,
    latest,
    (record) => finiteValue(record.ssrRequestThroughputTests?.latencyMs),
    now,
  )
}

export function prepareNodeModulesSizeHistory(
  records: readonly InstallChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['nodeModulesSize'],
    records.map((record) => ({
      record,
      value: finiteValue(record.install.nodeModulesSizeBytes?.value, 1048576),
    })),
  )
}

export function prepareNodeModulesSizeComparison(
  records: readonly InstallChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['nodeModulesSize'],
    records.map((record) => ({
      record,
      value: finiteValue(record.install.nodeModulesSizeBytes?.value, 1048576),
    })),
  )
}

export function prepareNodeModulesSizeMonthlyComparison(
  history: readonly ChartMeasurement[],
  latest: readonly ChartMeasurement[],
  now?: Date,
): LineComparisonChartPayload {
  return monthlyComparison(
    metricCatalogue['nodeModulesSize'],
    history,
    latest,
    (record) =>
      finiteValue(record.install?.nodeModulesSizeBytes?.value, 1048576),
    now,
  )
}

export function prepareDependencyInstallSizeHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['depInstallSize'],
    records.map((record) => ({
      record,
      value: finiteValue(record.depInstallSize?.value, 1048576),
    })),
  )
}

export function prepareSSRLatencyHistory(
  records: readonly ChartMeasurement[],
  workers: ConnectionCount,
  percentile: LatencyPercentile,
  testsKey: SSRLoadKey = 'ssrLoadTests',
): VersionLineChartPayload {
  return history(
    metricCatalogue[`${testsKey}.latency.${workers}.${percentile}`],
    records.map((record) => ({
      record,
      value: finiteValue(
        record[testsKey]?.stages?.find((stage) => stage.workers === workers)?.[
          percentile
        ],
      ),
    })),
  )
}

export function prepareSSRTotalRequestsHistory(
  records: readonly ChartMeasurement[],
  testsKey: SSRLoadKey = 'ssrLoadTests',
): VersionLineChartPayload {
  return history(
    metricCatalogue[`${testsKey}.totalRequests`],
    records.map((record) => ({
      record,
      value: finiteValue(record[testsKey]?.totalRequests?.value),
    })),
  )
}

export type SSRLoadKey = 'ssrLoadTests' | 'ssrRouterLinkLoadTests'
export type LatencyPercentile = 'p75LatencyMs' | 'p90LatencyMs' | 'p99LatencyMs'
export type ConnectionCount = 25 | 50 | 100

export function prepareSSRLatencyByConnections(
  records: readonly ChartMeasurement[],
  percentile: LatencyPercentile,
  testsKey: SSRLoadKey = 'ssrLoadTests',
): LineComparisonChartPayload {
  const stagesFor = (record: ChartMeasurement) => record[testsKey]?.stages ?? []
  const connections = [
    ...new Set(records.flatMap((r) => stagesFor(r).map((s) => s.workers))),
  ].sort((a, b) => a - b)

  return {
    id: `${testsKey}.latencyByConnections.${percentile}`,
    title: `${percentile.slice(0, 3).toUpperCase()} Latency`,
    valueFormat: 'ms',
    yAxisLabel: 'Milliseconds (log scale)',
    xValues: connections.map(String),
    scale: 'connections',
    tooltip: 'detail',
    series: records
      .flatMap((record) =>
        record.package == null
          ? []
          : [
              {
                ...seriesIdentity(record.package, record),
                points: connections.map((workers) => {
                  const stage = stagesFor(record).find(
                    (s) => s.workers === workers,
                  )
                  return {
                    x: String(workers),
                    value: finiteValue(stage?.[percentile]),
                    version: record.frameworkVersion ?? null,
                    range: stage?.latencyRanges?.[percentile],
                  }
                }),
              },
            ],
      )
      .filter((s) => s.points.some((point) => point.value != null))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }
}
