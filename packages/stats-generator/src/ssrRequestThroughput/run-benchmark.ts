import { Bench } from 'tinybench'
import { IncomingMessage, ServerResponse } from './mock-http.ts'
import type {
  NodeServerRenderHandler,
  ServerRenderHandler,
  SSRRequestThroughputBenchmarkResult,
  WebServerRenderHandler,
} from './types.ts'

const SSR_REQUEST_HANDLER_THROUGHPUT_PATH = '/ssr-throughput'
const HTML_ACCEPT_HEADER = 'text/html,application/xhtml+xml'

interface HandlerConfig {
  name: string
  displayName: string
  package: string
  handler: ServerRenderHandler
}

interface HandlerResult {
  body: string
  length: number
  status: number
}

async function runWebHandler(
  handler: WebServerRenderHandler,
  collect = false,
): Promise<HandlerResult> {
  const request = new Request(
    `http://localhost${SSR_REQUEST_HANDLER_THROUGHPUT_PATH}`,
    {
      headers: {
        Accept: HTML_ACCEPT_HEADER,
      },
    },
  )
  const response = await handler(request)
  const buffer = await response.arrayBuffer()
  const body = collect ? new TextDecoder().decode(buffer) : ''
  return { body, length: buffer.byteLength, status: response.status }
}

async function runNodeHandler(
  handler: NodeServerRenderHandler,
  collect = false,
): Promise<HandlerResult> {
  const request = new IncomingMessage(SSR_REQUEST_HANDLER_THROUGHPUT_PATH)
  request.headers = {
    accept: HTML_ACCEPT_HEADER,
    host: 'localhost',
  }
  const response = new ServerResponse(request, collect)

  await handler(request, response)
  await response.await
  return {
    body: response.body,
    length: response.length,
    status: response.statusCode ?? 200,
  }
}

async function runHandler(
  serverRenderHandler: ServerRenderHandler,
  collect = false,
): Promise<HandlerResult> {
  if (serverRenderHandler.type === 'web') {
    return runWebHandler(serverRenderHandler.handler, collect)
  }
  return runNodeHandler(serverRenderHandler.handler, collect)
}

function validateHandlerResult(config: HandlerConfig, result: HandlerResult) {
  if (result.status !== 200) {
    throw new Error(
      `${config.name} returned status ${result.status} for ${SSR_REQUEST_HANDLER_THROUGHPUT_PATH}`,
    )
  }

  if (result.length === 0) {
    throw new Error(
      `${config.name} returned an empty response for ${SSR_REQUEST_HANDLER_THROUGHPUT_PATH}`,
    )
  }

  if (!result.body.includes('<table')) {
    throw new Error(
      `${config.name} did not render the benchmark table for ${SSR_REQUEST_HANDLER_THROUGHPUT_PATH}`,
    )
  }
}

function getDuplicationFactor(body: string): number {
  const samples: Record<string, number> = {}
  const matches = body.matchAll(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
  )

  for (const match of matches) {
    samples[match[0]] = (samples[match[0]] ?? 0) + 1
  }

  const values = Object.values(samples)
  if (values.length === 0) return 1
  return values.reduce((a, b) => a + b, 0) / values.length
}

export async function runBenchmark(
  handlers: HandlerConfig[],
): Promise<SSRRequestThroughputBenchmarkResult[]> {
  const bench = new Bench({
    time: 10_000,
    setup: async (task, mode) => {
      if (mode === 'run' && task !== undefined) {
        console.info(`Running ${task.name} benchmark...`)
      }
    },
  })

  for (const config of handlers) {
    validateHandlerResult(config, await runHandler(config.handler, true))

    bench.add(config.name, async () => {
      await runHandler(config.handler)
    })
  }

  await bench.run()

  const results: SSRRequestThroughputBenchmarkResult[] = []

  for (const config of handlers) {
    const task = bench.getTask(config.name)
    if (!task || !task.result || task.result.state !== 'completed') {
      throw new Error(`Benchmark did not complete for ${config.name}`)
    }

    const handlerResult = await runHandler(config.handler, true)
    validateHandlerResult(config, handlerResult)
    const { body, length } = handlerResult
    const duplicationFactor = getDuplicationFactor(body)

    results.push({
      name: config.name,
      displayName: config.displayName,
      package: config.package,
      opsPerSec: Math.round(task.result.throughput.mean),
      avgLatencyMs: Number(task.result.latency.mean.toFixed(3)),
      medianLatencyMs: Number(task.result.latency.p50.toFixed(3)),
      samples: task.result.throughput.samplesCount,
      bodySizeKb: Number((length / 1024).toFixed(2)),
      duplicationFactor: Number(duplicationFactor.toFixed(2)),
    })
  }

  return results
}
