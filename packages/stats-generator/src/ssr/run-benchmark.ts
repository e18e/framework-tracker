import { Bench } from 'tinybench'
import { IncomingMessage, ServerResponse } from './mock-http.ts'
import type { SSRHandler, SSRBenchmarkResult } from './types.ts'

interface HandlerConfig {
  name: string
  displayName: string
  package: string
  handler: SSRHandler
}

async function runHandler(
  handler: SSRHandler,
  collect = false,
): Promise<ServerResponse> {
  const request = new IncomingMessage()
  const response = new ServerResponse(request, collect)

  handler(request, response)

  await response.await
  return response
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
): Promise<SSRBenchmarkResult[]> {
  const bench = new Bench({
    time: 10_000,
    setup: async (task, mode) => {
      if (mode === 'run') {
        console.log(`Running ${task.name} benchmark...`)
      }
    },
  })

  for (const config of handlers) {
    bench.add(config.name, async () => {
      await runHandler(config.handler)
    })
  }

  await bench.warmup()
  await bench.run()

  const results: SSRBenchmarkResult[] = []

  for (const config of handlers) {
    const task = bench.getTask(config.name)
    if (!task || !task.result) continue

    const response = await runHandler(config.handler, true)
    const duplicationFactor = getDuplicationFactor(response.body)

    results.push({
      name: config.name,
      displayName: config.displayName,
      package: config.package,
      opsPerSec: Math.round(task.result.hz),
      avgLatencyMs: Number(task.result.mean.toFixed(3)),
      samples: task.result.samples.length,
      bodySizeKb: Number((response.length / 1024).toFixed(2)),
      duplicationFactor: Number(duplicationFactor.toFixed(2)),
    })
  }

  return results
}
