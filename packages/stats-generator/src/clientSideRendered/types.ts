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
  clientSideRenderedTests: import('zod').infer<
    typeof import('../schemas.ts').ClientRenderingBenchmarkSchema
  >
}
