import type { InteractionTestStats, InteractionTiming } from '../types.ts'

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
  }
}

export interface ServerSideRenderedStats {
  timingMeasuredAt: string
  runner: string
  browserVersion?: string
  frameworkVersion?: string
  serverSideRenderedTests: {
    firstPaintMs: number
    fcpMs: number
    inpMs?: number
    interactionTests?: InteractionTestStats
    runs: number
  }
}
