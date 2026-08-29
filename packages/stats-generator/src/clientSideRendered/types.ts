import type {
  InteractionTestStats,
  InteractionTiming,
  RenderedTestSample,
  RenderedTestStandardDeviation,
} from '../types.ts'

export interface ClientSideRenderedRunResult {
  firstPaintMs: number | null
  fcpMs: number | null
  interaction: InteractionTiming | null
}

export interface ClientSideRenderedBenchmarkResult {
  name: string
  displayName: string
  package: string
  browserVersion: string
  clientSideRenderedTests: {
    firstPaintMs: number
    fcpMs: number
    interactionTests: InteractionTestStats
    runs: number
    standardDeviation: RenderedTestStandardDeviation
    samples: RenderedTestSample[]
  }
}

export interface ClientSideRenderedStats {
  timingMeasuredAt: string
  runner: string
  browserVersion?: string
  frameworkVersion?: string
  clientSideRenderedTests: {
    firstPaintMs: number
    fcpMs: number
    inpMs?: number
    interactionTests?: InteractionTestStats
    runs: number
    standardDeviation?: RenderedTestStandardDeviation
    samples?: RenderedTestSample[]
  }
}
