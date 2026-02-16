import type { IncomingMessage, ServerResponse } from './mock-http.ts'

export type WebSSRHandler = (request: Request) => Promise<Response>

export type NodeSSRHandler = (
  req: IncomingMessage,
  res: ServerResponse,
) => void | Promise<void>

export type SSRHandler =
  | { type: 'web'; handler: WebSSRHandler }
  | { type: 'node'; handler: NodeSSRHandler }

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
