import type { IncomingMessage, ServerResponse } from './mock-http.ts'

export type SSRHandler = (
  req: IncomingMessage,
  res: ServerResponse,
) => void | Promise<void>

export interface SSRBenchmarkResult {
  name: string
  displayName: string
  package: string
  opsPerSec: number
  avgLatencyMs: number
  samples: number
  bodySizeKb: number
  duplicationFactor: number
}

export interface SSRStats {
  name: string
  package: string
  type: 'ssr-app'
  ssrOpsPerSec: number
  ssrAvgLatencyMs: number
  ssrSamples: number
  ssrBodySizeKb: number
  ssrDuplicationFactor: number
}
