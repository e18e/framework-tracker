import type { z } from 'zod'
import type { RequestThroughputBenchmarkSchema } from '../schemas.ts'
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
  benchmark: z.infer<typeof RequestThroughputBenchmarkSchema>
}
