import { metricCatalogue } from './metrics.ts'
import type {
  ChartMeasurement,
  InstallChartMeasurement,
  MetricDefinition,
  PreparedComparisonChart,
  VersionLineChartPayload,
} from './types'

type Measurement = { record: ChartMeasurement; value: number | null }

function finiteValue(value: number | undefined, divisor = 1): number | null {
  return value != null && Number.isFinite(value)
    ? Math.max(0, value / divisor)
    : null
}

// These helpers only assemble the common output. Each export reads its own measurements.
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
                focused:
                  record.package === 'app-baseline-html' ||
                  record.isFocused !== false,
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
    metricCatalogue['devServerStartTime.avgMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.devServerStartTime?.avgMs, 1000),
    })),
  )
}

export function prepareDevServerStartTimeComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['devServerStartTime.avgMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.devServerStartTime?.avgMs, 1000),
    })),
  )
}

export function prepareFrameworkDependenciesProdDependenciesHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['frameworkDependencies.prodDependencies'],
    records.map((record) => ({
      record,
      value: finiteValue(record.frameworkDependencies?.prodDependencies),
    })),
  )
}

export function prepareFrameworkDependenciesProdDependenciesComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['frameworkDependencies.prodDependencies'],
    records.map((record) => ({
      record,
      value: finiteValue(record.frameworkDependencies?.prodDependencies),
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
      value: finiteValue(record.frameworkDependencies?.devDependencies),
    })),
  )
}

export function prepareFrameworkDependenciesDevDependenciesComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['frameworkDependencies.devDependencies'],
    records.map((record) => ({
      record,
      value: finiteValue(record.frameworkDependencies?.devDependencies),
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
      value: finiteValue(record.frameworkDependencies?.allDependencies),
    })),
  )
}

export function prepareFrameworkDependenciesAllDependenciesComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['frameworkDependencies.allDependencies'],
    records.map((record) => ({
      record,
      value: finiteValue(record.frameworkDependencies?.allDependencies),
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
      value: finiteValue(record.prodDependencies),
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
      value: finiteValue(record.prodDependencies),
    })),
  )
}

export function prepareDevDependenciesHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['devDependencies'],
    records.map((record) => ({
      record,
      value: finiteValue(record.devDependencies),
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
      value: finiteValue(record.devDependencies),
    })),
  )
}

export function prepareAllDependenciesHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['allDependencies'],
    records.map((record) => ({
      record,
      value: finiteValue(record.allDependencies),
    })),
  )
}

export function prepareAllDependenciesComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['allDependencies'],
    records.map((record) => ({
      record,
      value: finiteValue(record.allDependencies),
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
      value: finiteValue(record.duplicateDependencies),
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
      value: finiteValue(record.duplicateDependencies),
    })),
  )
}

export function prepareClientSideRenderedTestsFirstPaintMsHistory(
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

export function prepareClientSideRenderedTestsFirstPaintMsComparison(
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

export function prepareClientSideRenderedTestsFcpMsHistory(
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

export function prepareClientSideRenderedTestsFcpMsComparison(
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

export function prepareInstallTimeHistory(
  records: readonly InstallChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['installTime.avgMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.install.installTimeMs.mean, 1000),
    })),
  )
}

export function prepareInstallTimeComparison(
  records: readonly InstallChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['installTime.avgMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.install.installTimeMs.mean, 1000),
    })),
  )
}

export function prepareColdBuildTimeHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['coldBuildTime.avgMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.coldBuildTime?.avgMs, 1000),
    })),
  )
}

export function prepareColdBuildTimeComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['coldBuildTime.avgMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.coldBuildTime?.avgMs, 1000),
    })),
  )
}

export function prepareWarmBuildTimeHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['warmBuildTime.avgMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.warmBuildTime?.avgMs, 1000),
    })),
  )
}

export function prepareWarmBuildTimeComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['warmBuildTime.avgMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.warmBuildTime?.avgMs, 1000),
    })),
  )
}

export function prepareCoreJsSizeHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['vendoredCoreJsSize'],
    records.map((record) => ({
      record,
      value: finiteValue(record.vendoredCoreJsSize, 1024),
    })),
  )
}

export function prepareCoreJsSizeComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['vendoredCoreJsSize'],
    records.map((record) => ({
      record,
      value: finiteValue(record.vendoredCoreJsSize, 1024),
    })),
  )
}

export function prepareServerSideRenderedTestsFirstPaintMsHistory(
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

export function prepareServerSideRenderedTestsFirstPaintMsComparison(
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

export function prepareServerSideRenderedTestsFcpMsHistory(
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

export function prepareServerSideRenderedTestsFcpMsComparison(
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

export function prepareSsrRequestThroughputTestsBodySizeKbHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['ssrRequestThroughputTests.bodySizeKb'],
    records.map((record) => ({
      record,
      value: finiteValue(record.ssrRequestThroughputTests?.bodySizeKb),
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
      value: finiteValue(record.ssrRequestThroughputTests?.bodySizeKb),
    })),
  )
}

export function prepareSsrRequestThroughputTestsMedianLatencyMsHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['ssrRequestThroughputTests.medianLatencyMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.ssrRequestThroughputTests?.medianLatencyMs),
    })),
  )
}

export function prepareSsrRequestThroughputTestsMedianLatencyMsComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['ssrRequestThroughputTests.medianLatencyMs'],
    records.map((record) => ({
      record,
      value: finiteValue(record.ssrRequestThroughputTests?.medianLatencyMs),
    })),
  )
}

export function prepareNodeModulesSizeHistory(
  records: readonly InstallChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['nodeModulesSize'],
    records.map((record) => ({
      record,
      value: finiteValue(record.install.nodeModulesSizeBytes, 1048576),
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
      value: finiteValue(record.install.nodeModulesSizeBytes, 1048576),
    })),
  )
}

export function prepareDependencyInstallSizeHistory(
  records: readonly ChartMeasurement[],
): VersionLineChartPayload {
  return history(
    metricCatalogue['depInstallSize'],
    records.map((record) => ({
      record,
      value: finiteValue(record.depInstallSize, 1048576),
    })),
  )
}

export function prepareDependencyInstallSizeComparison(
  records: readonly ChartMeasurement[],
): PreparedComparisonChart {
  return comparison(
    metricCatalogue['depInstallSize'],
    records.map((record) => ({
      record,
      value: finiteValue(record.depInstallSize, 1048576),
    })),
  )
}

export type SSRLoadKey = 'ssrLoadTests' | 'ssrRouterLinkLoadTests'
export type LatencyPercentile = 'p75LatencyMs' | 'p90LatencyMs' | 'p99LatencyMs'
export type ConnectionCount = 25 | 50 | 100

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
      value: finiteValue(record[testsKey]?.totalRequests),
    })),
  )
}

export function prepareSSRLatencyComparison(
  records: readonly ChartMeasurement[],
  workers: ConnectionCount,
  percentile: LatencyPercentile,
  testsKey: SSRLoadKey = 'ssrLoadTests',
): PreparedComparisonChart {
  return comparison(
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

export function prepareSSRTotalRequestsComparison(
  records: readonly ChartMeasurement[],
  testsKey: SSRLoadKey = 'ssrLoadTests',
): PreparedComparisonChart {
  return comparison(
    metricCatalogue[`${testsKey}.totalRequests`],
    records.map((record) => ({
      record,
      value: finiteValue(record[testsKey]?.totalRequests),
    })),
  )
}
