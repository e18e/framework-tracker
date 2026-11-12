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
  'inputDelay' | 'processingDuration' | 'presentationDelay'

export type InteractionTimings = Partial<
  Record<InteractionPhaseKey | 'interactionLatency', number>
>

/** One framework version's interaction latency split into its phases. */
export interface InteractionHistoryDatum extends Record<
  InteractionPhaseKey | 'interactionLatency',
  number
> {
  id: string
  name: string
}

type DependencyCounts = Pick<
  FrameworkResult,
  | 'productionDependencyCount'
  | 'developmentDependencyCount'
  | 'totalDependencyCount'
  | 'duplicateDependencyCount'
>

/** Measurement subset accepted by chart preparation; Astro collection records fit structurally. */
export interface ChartMeasurement {
  package?: string
  name?: string
  frameworkVersion?: string
  releasedAt?: string
  devServer?: {
    medianMs?: number
  }
  install?: {
    duration?: { mean?: number }
    nodeModulesSize?: NonNullable<FrameworkResult['install']>['nodeModulesSize']
  }
  frameworkDependencies?: DependencyCounts
  firstPartyDependencies?: DependencyCounts
  productionDependencyCount?: FrameworkResult['productionDependencyCount']
  developmentDependencyCount?: FrameworkResult['developmentDependencyCount']
  totalDependencyCount?: FrameworkResult['totalDependencyCount']
  duplicateDependencyCount?: FrameworkResult['duplicateDependencyCount']
  clientSideRendered?: {
    firstPaint?: number
    firstContentfulPaint?: number
    interactionTests?: InteractionTimings
  }
  coldBuild?: {
    medianMs?: number
  }
  warmBuild?: {
    medianMs?: number
  }
  vendoredCoreJsSize?: FrameworkResult['vendoredCoreJsSize']
  serverSideRendered?: {
    firstPaint?: number
    firstContentfulPaint?: number
    interactionTests?: InteractionTimings
  }
  ssrRequestThroughput?: {
    requestThroughput?: number
    bodySize?: NonNullable<FrameworkResult['ssrRequestThroughput']>['bodySize']
    latency?: number
  }
  dependencyInstallSize?: FrameworkResult['dependencyInstallSize']
  ssrLoad?: SSRLoadMeasurements
  ssrRouterLinkLoad?: SSRLoadMeasurements
}

interface SSRLoadMeasurements {
  totalRequestCount?: NonNullable<
    FrameworkResult['ssrLoad']
  >['totalRequestCount']
  stages?: {
    connections: number
    latencyRanges?: Partial<
      Record<
        'p75Latency' | 'p90Latency' | 'p99Latency',
        { min: number; median: number; max: number }
      >
    >
    p75Latency?: number
    p90Latency?: number
    p99Latency?: number
  }[]
}

/** Install charts require a completed install benchmark. */
export type InstallChartMeasurement = ChartMeasurement & {
  install: {
    duration: { median: number }
    nodeModulesSize: NonNullable<FrameworkResult['install']>['nodeModulesSize']
  }
}
