import type { BrandVariant, ThemedValue } from './framework-logos'
import type { LineChartScaleId, LineChartTooltipId } from './line-chart-config'

export type ChartValueFormat = 'count' | 'mb' | 'kb' | 'ms' | 's'

export interface ChartDatum {
  id?: string
  name: string
  value: number
  range?: { min: number; median: number; max: number }
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

export interface StackedAreaChartPayload {
  title: string
  data: { name: string; total: number | null; values: Record<string, number> }[]
  series: readonly {
    key: string
    label: string
    color: string
  }[]
  valueFormat: ChartValueFormat
  yAxisLabel: string
  totalLabel?: string
}

export interface LineComparisonPoint {
  x: string
  value: number | null
  version: string | null
  /** Spread across benchmark runs, shown in the detail tooltip. */
  range?: { min: number; median: number; max: number }
}

export interface LineComparisonSeries {
  id: string
  name: string
  /** Key into `frameworkBrands`, used to apply live theme overrides. */
  brand: string | null
  /** Brand colour from `framework-logos.ts`. */
  color: ThemedValue
  /** `segmented` draws a broken line, e.g. for the Baseline HTML reference. */
  variant: BrandVariant
  points: LineComparisonPoint[]
}

export interface LineComparisonChartPayload extends MetricDefinition {
  scale: LineChartScaleId
  tooltip: LineChartTooltipId
  xValues: string[]
  series: LineComparisonSeries[]
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

interface DependencyCounts {
  prodDependencies?: number
  devDependencies?: number
  allDependencies?: number
}

/** Measurement subset accepted by chart preparation; Astro collection records fit structurally. */
export interface ChartMeasurement {
  package?: string
  name?: string
  frameworkVersion?: string
  releasedAt?: string
  devServerStartTime?: {
    medianMs?: number
  }
  install?: {
    installTimeMs?: { mean?: number }
    nodeModulesSizeBytes?: number
  }
  frameworkDependencies?: DependencyCounts
  firstPartyDependencies?: DependencyCounts
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
    latencyRanges?: Partial<
      Record<
        'p75LatencyMs' | 'p90LatencyMs' | 'p99LatencyMs',
        { min: number; median: number; max: number }
      >
    >
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
