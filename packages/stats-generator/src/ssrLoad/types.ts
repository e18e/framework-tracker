import type { z } from 'zod'
import type { SSRLoadTestsSchema, SSRLoadSweepSchema } from '../schemas.ts'

export type SSRLoadStageStats = z.infer<typeof SSRLoadSweepSchema>[number]
export type SSRLoadSweep = z.infer<typeof SSRLoadSweepSchema>

export type SSRLoadTests = z.infer<typeof SSRLoadTestsSchema>

export interface SSRLoadBenchmarkResult {
  name: string
  displayName: string
  package: string
  tests: SSRLoadTests
}
