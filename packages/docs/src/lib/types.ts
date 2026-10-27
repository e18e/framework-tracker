export type ChartValueFormat = 'count' | 'mb' | 'kb' | 'ms' | 's'

export interface ChartDatum {
  id?: string
  name: string
  value: number
  focused?: boolean
  version?: string
}

export interface ComparisonChartPayload {
  id?: string
  data: ChartDatum[]
  valueFormat: ChartValueFormat
  yAxisLabel: string
}

export interface VersionLineChartPayload {
  id: string
  title: string
  description?: string
  data: { id: string; name: string; value: number | null }[]
  valueFormat: ChartValueFormat
  yAxisLabel: string
}

export interface MetricDefinition {
  id: string
  title: string
  description?: string
  valueFormat: ChartValueFormat
  yAxisLabel: string
}

export interface PreparedComparisonChart extends ComparisonChartPayload {
  id: string
  title: string
  description?: string
  data: (ChartDatum & { id: string })[]
}

/** Measurement subset accepted by chart preparation; Astro collection records fit structurally. */
export interface ChartMeasurement {
  package?: string
  name?: string
  frameworkVersion?: string
  isFocused?: boolean
  devServerStartTime?: {
    medianMs?: number
  }
  frameworkDependencies?: {
    prodDependencies?: number
    devDependencies?: number
    allDependencies?: number
  }
  prodDependencies?: number
  devDependencies?: number
  allDependencies?: number
  duplicateDependencies?: number
  clientSideRenderedTests?: {
    firstPaintMs?: number
    fcpMs?: number
  }
  coldBuildTime?: {
    medianMs?: number
  }
  warmBuildTime?: {
    medianMs?: number
  }
  vendoredCoreJsSize?: number
  serverSideRenderedTests?: {
    firstPaintMs?: number
    fcpMs?: number
  }
  ssrRequestThroughputTests?: {
    opsPerSec?: number
    bodySizeKb?: number
    latencyMs?: number
  }
  depInstallSize?: number
  ssrLoadTests?: SSRLoadMeasurements
  ssrRouterLinkLoadTests?: SSRLoadMeasurements
}

interface SSRLoadMeasurements {
  totalRequests?: number
  stages?: {
    workers: number
    p75LatencyMs?: number
    p90LatencyMs?: number
    p99LatencyMs?: number
  }[]
}

/** Install charts require a completed install benchmark. */
export type InstallChartMeasurement = ChartMeasurement & {
  install: {
    installTimeMs: { median: number }
    nodeModulesSizeBytes: number
  }
}
