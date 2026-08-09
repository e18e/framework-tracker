import type { InteractionTestStats, InteractionTiming } from '../types.ts'

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
  }
}
