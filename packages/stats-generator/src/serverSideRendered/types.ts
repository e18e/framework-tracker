import type { z } from 'zod'
import type { ServerRenderingBenchmarkSchema } from '@framework-performance/results'
import type { InteractionTiming } from '../types.ts'
export interface ServerSideRenderedRunResult {
  firstPaint: number | null
  firstContentfulPaint: number | null
  interaction: InteractionTiming | null
}

export interface ServerSideRenderedBenchmarkResult {
  name: string
  displayName: string
  package: string
  browserVersion: string
  serverSideRendered: z.infer<typeof ServerRenderingBenchmarkSchema>
}
