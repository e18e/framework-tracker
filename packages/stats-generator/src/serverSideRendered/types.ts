import type {
  InteractionTestStats,
  InteractionTiming,
  RenderedTestSample,
  RenderedTestStandardDeviation,
} from '../types.ts'

export interface ServerSideRenderedRunResult {
  firstPaintMs: number | null
  fcpMs: number | null
  interaction: InteractionTiming | null
}

export interface ServerSideRenderedBenchmarkResult {
  name: string
  displayName: string
  package: string
  browserVersion: string
  serverSideRenderedTests: {
    firstPaintMs: number
    fcpMs: number
    interactionTests: InteractionTestStats
    runs: number
    standardDeviation: RenderedTestStandardDeviation
    samples: RenderedTestSample[]
  }
}
