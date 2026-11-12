import type { z } from 'zod'
import type { ClientRenderingBenchmarkSchema } from '@framework-performance/results'
import type { InteractionTiming } from '../types.ts'

export interface ClientSideRenderedRunResult {
  firstPaint: number | null
  fcp: number | null
  interaction: InteractionTiming | null
}

export interface ClientSideRenderedBenchmarkResult {
  name: string
  displayName: string
  package: string
  browserVersion: string
  clientSideRenderedTests: z.infer<typeof ClientRenderingBenchmarkSchema>
}
