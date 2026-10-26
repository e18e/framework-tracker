import type { z } from 'zod'
import type { ServerRenderingBenchmarkSchema } from '@framework-tracker/results'
import type { InteractionTiming } from '../types.ts'
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
  serverSideRenderedTests: z.infer<typeof ServerRenderingBenchmarkSchema>
}
