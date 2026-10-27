import type { z } from 'zod'
import type { ClientRenderingBenchmarkSchema } from '@framework-tracker/results'
import type { InteractionTiming } from '../types.ts'

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
  clientSideRenderedTests: z.infer<typeof ClientRenderingBenchmarkSchema>
}
