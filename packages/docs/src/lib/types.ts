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

export interface MonthlyComparisonPoint {
  /** First day of the month as `YYYY-MM`, or `latest` for the latest results. */
  month: string
  value: number | null
  version: string | null
}

export interface MonthlyComparisonSeries {
  id: string
  name: string
  focused: boolean
  /** Reference series (Baseline HTML) drawn as a neutral dashed line. */
  baseline: boolean
  /** Brand colour from `framework-logos.ts`; null draws a neutral line. */
  color: { dark: string; light?: string } | null
  points: MonthlyComparisonPoint[]
}

export interface MonthlyComparisonChartPayload extends MetricDefinition {
  months: string[]
  series: MonthlyComparisonSeries[]
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

export type InteractionPhaseKey =
  'inputDelayMs' | 'processingDurationMs' | 'presentationDelayMs'

export type InteractionTimings = Partial<
  Record<InteractionPhaseKey | 'interactionLatencyMs', number>
>

/** One framework version's interaction latency split into its phases. */
export interface InteractionHistoryDatum extends Record<
  InteractionPhaseKey | 'interactionLatencyMs',
  number
> {
  id: string
  name: string
}

/** Measurement subset accepted by chart preparation; Astro collection records fit structurally. */
export interface ChartMeasurement {
  package?: string
  name?: string
  frameworkVersion?: string
  releasedAt?: string
  isFocused?: boolean
  devServerStartTime?: {
    medianMs?: number
  }
  install?: {
    installTimeMs?: { mean?: number }
    nodeModulesSizeBytes?: number
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
    interactionTests?: InteractionTimings
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
    interactionTests?: InteractionTimings
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
