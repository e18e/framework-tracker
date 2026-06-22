import type { IncomingMessage, ServerResponse } from './mock-http.ts'

export type WebServerRenderHandler = (request: Request) => Promise<Response>

export type NodeServerRenderHandler = (
  req: IncomingMessage,
  res: ServerResponse,
) => void | Promise<void>

export type ServerRenderHandler =
  | { type: 'web'; handler: WebServerRenderHandler }
  | { type: 'node'; handler: NodeServerRenderHandler }

export interface SSRRequestThroughputBenchmarkResult {
  name: string
  displayName: string
  package: string
  opsPerSec: number
  avgLatencyMs: number
  medianLatencyMs: number
  samples: number
  bodySizeKb: number
  duplicationFactor: number
}

export interface SSRRequestThroughputStats {
  name: string
  package: string
  type: 'runtime-app'
  ssrRequestThroughputTests: {
    opsPerSec: number
    avgLatencyMs: number
    medianLatencyMs: number
    samples: number
    bodySizeKb: number
    duplicationFactor: number
  }
}
