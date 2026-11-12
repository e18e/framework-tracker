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
  const container = source[group!]
  const raw = container?.[`${field}Range`] ?? container?.[field!]
  const summary =
    field === 'medianMs'
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
    metricCatalogue['devServer.medianMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.devServer?.medianMs, 1000),
    })),
  )
}

export function prepareDevServerStartTimeComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['devServer.medianMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.devServer?.medianMs, 1000),
    })),
  )
}

export function prepareDevServerStartTimeMonthlyComparison(
  history: readonly ChartMeasurement[],
  latest: readonly ChartMeasurement[],
  now?: Date,
): LineComparisonChartPayload {
  return monthlyComparison(
    metricCatalogue['devServer.medianMs'],
    history,
    latest,
    (record) => finiteValue(record.devServer?.medianMs, 1000),
    now,
  )
}

export function prepareFrameworkDependenciesProdDependenciesHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['frameworkDependencies.productionDependencyCount'],
    records.map((record) => ({
      record,
      value: finiteValue(
        record.frameworkDependencies?.productionDependencyCount?.value,
      ),
    })),
  )
}

export function prepareFrameworkDependenciesDevDependenciesHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['frameworkDependencies.developmentDependencyCount'],
    records.map((record) => ({
      record,
      value: finiteValue(
        record.frameworkDependencies?.developmentDependencyCount?.value,
      ),
    })),
  )
}

export function prepareFrameworkDependenciesAllDependenciesHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['frameworkDependencies.totalDependencyCount'],
    records.map((record) => ({
      record,
      value: finiteValue(
        record.frameworkDependencies?.totalDependencyCount?.value,
      ),
    })),
  )
}

export function prepareProdDependenciesHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['productionDependencyCount'],
    records.map((record) => ({
      record,
      value: finiteValue(record.productionDependencyCount?.value),
    })),
  )
}

export function prepareProdDependenciesComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['productionDependencyCount'],
    records.map((record) => ({
      record,
      value: finiteValue(record.productionDependencyCount?.value),
    })),
  )
}

export function prepareProdDependenciesMonthlyComparison(
  history: readonly ChartMeasurement[],
  latest: readonly ChartMeasurement[],
  now?: Date,
): LineComparisonChartPayload {
  return monthlyComparison(
    metricCatalogue['productionDependencyCount'],
    history,
    latest,
    (record) => finiteValue(record.productionDependencyCount?.value),
    now,
  )
}

export function prepareDevDependenciesHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['developmentDependencyCount'],
    records.map((record) => ({
      record,
      value: finiteValue(record.developmentDependencyCount?.value),
    })),
  )
}

export function prepareDevDependenciesComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['developmentDependencyCount'],
    records.map((record) => ({
      record,
      value: finiteValue(record.developmentDependencyCount?.value),
    })),
  )
}

export function prepareDevDependenciesMonthlyComparison(
  history: readonly ChartMeasurement[],
  latest: readonly ChartMeasurement[],
  now?: Date,
): LineComparisonChartPayload {
  return monthlyComparison(
    metricCatalogue['developmentDependencyCount'],
    history,
    latest,
    (record) => finiteValue(record.developmentDependencyCount?.value),
    now,
  )
}

export function prepareAllDependenciesHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['totalDependencyCount'],
    records.map((record) => ({
      record,
      value: finiteValue(record.totalDependencyCount?.value),
    })),
  )
}

export function prepareDuplicateDependenciesHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['duplicateDependencyCount'],
    records.map((record) => ({
      record,
      value: finiteValue(record.duplicateDependencyCount?.value),
    })),
  )
}

export function prepareDuplicateDependenciesComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['duplicateDependencyCount'],
    records.map((record) => ({
      record,
      value: finiteValue(record.duplicateDependencyCount?.value),
    })),
  )
}

export function prepareDuplicateDependenciesMonthlyComparison(
  history: readonly ChartMeasurement[],
  latest: readonly ChartMeasurement[],
  now?: Date,
): LineComparisonChartPayload {
  return monthlyComparison(
    metricCatalogue['duplicateDependencyCount'],
    history,
    latest,
    (record) => finiteValue(record.duplicateDependencyCount?.value),
    now,
  )
}

export function prepareLighthouseClientSideRenderedTestsFirstPaintMsHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['clientSideRendered.firstPaint'],
    records.map((record) => ({
      record,
      value: finiteValue(record.clientSideRendered?.firstPaint),
    })),
  )
}

export function prepareLighthouseClientSideRenderedTestsFirstPaintMsComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['clientSideRendered.firstPaint'],
    records.map((record) => ({
      record,
      value: finiteValue(record.clientSideRendered?.firstPaint),
    })),
  )
}

export function prepareLighthouseClientSideRenderedTestsFirstPaintMsMonthlyComparison(
  history: readonly ChartMeasurement[],
  latest: readonly ChartMeasurement[],
  now?: Date,
): LineComparisonChartPayload {
  return monthlyComparison(
    metricCatalogue['clientSideRendered.firstPaint'],
    history,
    latest,
    (record) => finiteValue(record.clientSideRendered?.firstPaint),
    now,
  )
}

export function prepareLighthouseClientSideRenderedTestsFcpMsHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['clientSideRendered.firstContentfulPaint'],
    records.map((record) => ({
      record,
      value: finiteValue(record.clientSideRendered?.firstContentfulPaint),
    })),
  )
}

export function prepareLighthouseClientSideRenderedTestsFcpMsComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['clientSideRendered.firstContentfulPaint'],
    records.map((record) => ({
      record,
      value: finiteValue(record.clientSideRendered?.firstContentfulPaint),
    })),
  )
}

const INTERACTION_KEYS = [
  'interactionLatency',
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
  testsKey: 'clientSideRendered' | 'serverSideRendered',
): InteractionHistoryDatum[] {
  return records.flatMap((record) => {
    const timings = record[testsKey]?.interactionTests
    if (!hasInteractionTimings(timings)) return []

    const version = record.frameworkVersion ?? 'Unknown'
    return {
      id: `${record.package ?? 'unknown'}:${version}`,
      name: `v${version}`,
      interactionLatency: timings.interactionLatency,
      inputDelay: timings.inputDelay,
      processingDuration: timings.processingDuration,
      presentationDelay: timings.presentationDelay,
    }
  })
}

export function prepareLighthouseClientSideRenderedTestsInteractionHistory(
  records: readonly ChartMeasurement[],
): InteractionHistoryDatum[] {
  return interactionHistory(records, 'clientSideRendered')
}

export function prepareLighthouseServerSideRenderedTestsInteractionHistory(
  records: readonly ChartMeasurement[],
): InteractionHistoryDatum[] {
  return interactionHistory(records, 'serverSideRendered')
}

export function prepareLighthouseClientSideRenderedTestsFcpMsMonthlyComparison(
  history: readonly ChartMeasurement[],
  latest: readonly ChartMeasurement[],
  now?: Date,
): LineComparisonChartPayload {
  return monthlyComparison(
    metricCatalogue['clientSideRendered.firstContentfulPaint'],
    history,
    latest,
    (record) => finiteValue(record.clientSideRendered?.firstContentfulPaint),
    now,
  )
}

export function prepareInstallTimeHistory(
  records: readonly InstallChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['install.duration'],
    records.map((record) => ({
      record,
      value: finiteValue(record.install.duration.median, 1000),
    })),
  )
}

export function prepareInstallTimeComparison(
  records: readonly InstallChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['install.duration'],
    records.map((record) => ({
      record,
      value: finiteValue(record.install.duration.median, 1000),
    })),
  )
}

export function prepareInstallTimeMonthlyComparison(
  history: readonly ChartMeasurement[],
  latest: readonly ChartMeasurement[],
  now?: Date,
): LineComparisonChartPayload {
  return monthlyComparison(
    metricCatalogue['install.duration'],
    history,
    latest,
    (record) => finiteValue(record.install?.duration?.mean, 1000),
    now,
  )
}

export function prepareColdBuildTimeHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['coldBuild.medianMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.coldBuild?.medianMs, 1000),
    })),
  )
}

export function prepareColdBuildTimeComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['coldBuild.medianMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.coldBuild?.medianMs, 1000),
    })),
  )
}

export function prepareColdBuildTimeMonthlyComparison(
  history: readonly ChartMeasurement[],
  latest: readonly ChartMeasurement[],
  now?: Date,
): LineComparisonChartPayload {
  return monthlyComparison(
    metricCatalogue['coldBuild.medianMs'],
    history,
    latest,
    (record) => finiteValue(record.coldBuild?.medianMs, 1000),
    now,
  )
}

export function prepareWarmBuildTimeHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['warmBuild.medianMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.warmBuild?.medianMs, 1000),
    })),
  )
}

export function prepareWarmBuildTimeComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['warmBuild.medianMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.warmBuild?.medianMs, 1000),
    })),
  )
}

export function prepareWarmBuildTimeMonthlyComparison(
  history: readonly ChartMeasurement[],
  latest: readonly ChartMeasurement[],
  now?: Date,
): LineComparisonChartPayload {
  return monthlyComparison(
    metricCatalogue['warmBuild.medianMs'],
    history,
    latest,
    (record) => finiteValue(record.warmBuild?.medianMs, 1000),
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
    metricCatalogue['serverSideRendered.firstPaint'],
    records.map((record) => ({
      record,
      value: finiteValue(record.serverSideRendered?.firstPaint),
    })),
  )
}

export function prepareLighthouseServerSideRenderedTestsFirstPaintMsComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['serverSideRendered.firstPaint'],
    records.map((record) => ({
      record,
      value: finiteValue(record.serverSideRendered?.firstPaint),
    })),
  )
}

export function prepareLighthouseServerSideRenderedTestsFirstPaintMsMonthlyComparison(
  history: readonly ChartMeasurement[],
  latest: readonly ChartMeasurement[],
  now?: Date,
): LineComparisonChartPayload {
  return monthlyComparison(
    metricCatalogue['serverSideRendered.firstPaint'],
    history,
    latest,
    (record) => finiteValue(record.serverSideRendered?.firstPaint),
    now,
  )
}

export function prepareLighthouseServerSideRenderedTestsFcpMsHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['serverSideRendered.firstContentfulPaint'],
    records.map((record) => ({
      record,
      value: finiteValue(record.serverSideRendered?.firstContentfulPaint),
    })),
  )
}

export function prepareLighthouseServerSideRenderedTestsFcpMsComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['serverSideRendered.firstContentfulPaint'],
    records.map((record) => ({
      record,
      value: finiteValue(record.serverSideRendered?.firstContentfulPaint),
    })),
  )
}

export function prepareLighthouseServerSideRenderedTestsFcpMsMonthlyComparison(
  history: readonly ChartMeasurement[],
  latest: readonly ChartMeasurement[],
  now?: Date,
): LineComparisonChartPayload {
  return monthlyComparison(
    metricCatalogue['serverSideRendered.firstContentfulPaint'],
    history,
    latest,
    (record) => finiteValue(record.serverSideRendered?.firstContentfulPaint),
    now,
  )
}

export function prepareSsrRequestThroughputTestsOpsPerSecHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['ssrRequestThroughput.requestThroughput'],
    records.map((record) => ({
      record,
      value: finiteValue(record.ssrRequestThroughput?.requestThroughput),
    })),
  )
}

export function prepareSsrRequestThroughputTestsOpsPerSecComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['ssrRequestThroughput.requestThroughput'],
    records.map((record) => ({
      record,
      value: finiteValue(record.ssrRequestThroughput?.requestThroughput),
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
    metricCatalogue['ssrRequestThroughput.requestThroughput'],
    history,
    latest,
    (record) => finiteValue(record.ssrRequestThroughput?.requestThroughput),
    now,
  )
}

export function prepareSsrRequestThroughputTestsBodySizeKbHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['ssrRequestThroughput.bodySize'],
    records.map((record) => ({
      record,
      value: finiteValue(record.ssrRequestThroughput?.bodySize?.value),
    })),
  )
}

export function prepareSsrRequestThroughputTestsBodySizeKbComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['ssrRequestThroughput.bodySize'],
    records.map((record) => ({
      record,
      value: finiteValue(record.ssrRequestThroughput?.bodySize?.value),
    })),
  )
}

export function prepareSsrRequestThroughputTestsBodySizeKbMonthlyComparison(
  history: readonly ChartMeasurement[],
  latest: readonly ChartMeasurement[],
  now?: Date,
): LineComparisonChartPayload {
  return monthlyComparison(
    metricCatalogue['ssrRequestThroughput.bodySize'],
    history,
    latest,
    (record) => finiteValue(record.ssrRequestThroughput?.bodySize?.value),
    now,
  )
}

export function prepareSsrRequestThroughputTestsLatencyMsHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['ssrRequestThroughput.latency'],
    records.map((record) => ({
      record,
      value: finiteValue(record.ssrRequestThroughput?.latency),
    })),
  )
}

export function prepareSsrRequestThroughputTestsLatencyMsComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['ssrRequestThroughput.latency'],
    records.map((record) => ({
      record,
      value: finiteValue(record.ssrRequestThroughput?.latency),
    })),
  )
}

export function prepareSsrRequestThroughputTestsLatencyMsMonthlyComparison(
  history: readonly ChartMeasurement[],
  latest: readonly ChartMeasurement[],
  now?: Date,
): LineComparisonChartPayload {
  return monthlyComparison(
    metricCatalogue['ssrRequestThroughput.latency'],
    history,
    latest,
    (record) => finiteValue(record.ssrRequestThroughput?.latency),
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
      value: finiteValue(record.install.nodeModulesSize?.value, 1048576),
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
      value: finiteValue(record.install.nodeModulesSize?.value, 1048576),
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
    (record) => finiteValue(record.install?.nodeModulesSize?.value, 1048576),
    now,
  )
}

export function prepareDependencyInstallSizeHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['dependencyInstallSize'],
    records.map((record) => ({
      record,
      value: finiteValue(record.dependencyInstallSize?.value, 1048576),
    })),
  )
}

export function prepareSSRLatencyHistory(
  records: readonly ChartMeasurement[],
  connections: ConnectionCount,
  percentile: LatencyPercentile,
  testsKey: SSRLoadKey = 'ssrLoad',
): VersionLineChartPayload {
  return history(
    metricCatalogue[`${testsKey}.latency.${connections}.${percentile}`],
    records.map((record) => ({
      record,
      value: finiteValue(
        record[testsKey]?.stages?.find(
          (stage) => stage.connections === connections,
        )?.[percentile],
      ),
    })),
  )
}

export function prepareSSRTotalRequestsHistory(
  records: readonly ChartMeasurement[],
  testsKey: SSRLoadKey = 'ssrLoad',
): VersionLineChartPayload {
  return history(
    metricCatalogue[`${testsKey}.totalRequestCount`],
    records.map((record) => ({
      record,
      value: finiteValue(record[testsKey]?.totalRequestCount?.value),
    })),
  )
}

export type SSRLoadKey = 'ssrLoad' | 'ssrRouterLinkLoad'
export type LatencyPercentile = 'p75Latency' | 'p90Latency' | 'p99Latency'
export type ConnectionCount = 25 | 50 | 100

export function prepareSSRLatencyByConnections(
  records: readonly ChartMeasurement[],
  percentile: LatencyPercentile,
  testsKey: SSRLoadKey = 'ssrLoad',
): LineComparisonChartPayload {
  const stagesFor = (record: ChartMeasurement) => record[testsKey]?.stages ?? []
  const connectionCounts = [
    ...new Set(records.flatMap((r) => stagesFor(r).map((s) => s.connections))),
  ].sort((a, b) => a - b)

  return {
    id: `${testsKey}.latencyByConnections.${percentile}`,
    title: `${percentile.slice(0, 3).toUpperCase()} Latency`,
    valueFormat: 'ms',
    yAxisLabel: 'Milliseconds (log scale)',
    xValues: connectionCounts.map(String),
    scale: 'connections',
    tooltip: 'detail',
    series: records
      .flatMap((record) =>
        record.package == null
          ? []
          : [
              {
                ...seriesIdentity(record.package, record),
                points: connectionCounts.map((connections) => {
                  const stage = stagesFor(record).find(
                    (s) => s.connections === connections,
                  )
                  return {
                    x: String(connections),
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
