import type { FrameworkResult } from '@framework-performance/results'
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
  /** Reference series (Baseline HTML) drawn as a neutral dashed line. */
  baseline: boolean
  /** Brand colour from `framework-logos.ts`; null draws a neutral line. */
  color: { dark: string; light?: string } | null
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

type DependencyCounts = Pick<
  FrameworkResult,
  | 'prodDependencies'
  | 'devDependencies'
  | 'allDependencies'
  | 'duplicateDependencies'
>

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
    nodeModulesSizeBytes?: NonNullable<
      FrameworkResult['install']
    >['nodeModulesSizeBytes']
  }
  frameworkDependencies?: DependencyCounts
  firstPartyDependencies?: DependencyCounts
  prodDependencies?: FrameworkResult['prodDependencies']
  devDependencies?: FrameworkResult['devDependencies']
  allDependencies?: FrameworkResult['allDependencies']
  duplicateDependencies?: FrameworkResult['duplicateDependencies']
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
  vendoredCoreJsSize?: FrameworkResult['vendoredCoreJsSize']
  serverSideRenderedTests?: {
    firstPaintMs?: number
    fcpMs?: number
    interactionTests?: InteractionTimings
  }
  ssrRequestThroughputTests?: {
    opsPerSec?: number
    bodySizeKb?: NonNullable<
      FrameworkResult['ssrRequestThroughputTests']
    >['bodySizeKb']
    latencyMs?: number
  }
  depInstallSize?: FrameworkResult['depInstallSize']
  ssrLoadTests?: SSRLoadMeasurements
  ssrRouterLinkLoadTests?: SSRLoadMeasurements
}

interface SSRLoadMeasurements {
  totalRequests?: NonNullable<FrameworkResult['ssrLoadTests']>['totalRequests']
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
    nodeModulesSizeBytes: NonNullable<
      FrameworkResult['install']
    >['nodeModulesSizeBytes']
  }
}
