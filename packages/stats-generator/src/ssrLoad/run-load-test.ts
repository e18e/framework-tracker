import type { SSRLoadStageStats, SSRLoadTests } from './types.ts'

const STAGE_DURATION_MS = 5_000
const WORKER_STAGES = [1, 5, 10, 25, 50, 100, 200] as const

interface WorkerResult {
  latencies: number[]
  requests: number
  errors: number
  bytes: number
}

function percentile(values: number[], percentileValue: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(
    sorted.length - 1,
    Math.ceil((percentileValue / 100) * sorted.length) - 1,
  )
  return sorted[index]
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

async function runWorker(url: string, deadline: number): Promise<WorkerResult> {
  const latencies: number[] = []
  let requests = 0
  let errors = 0
  let bytes = 0

  while (Date.now() < deadline) {
    const start = performance.now()
    try {
      const response = await fetch(url, {
        headers: { Accept: 'text/html,application/xhtml+xml' },
      })
      const body = await response.arrayBuffer()
      const latency = performance.now() - start

      requests += 1
      bytes += body.byteLength
      latencies.push(latency)

      if (!response.ok) {
        errors += 1
      }
    } catch {
      errors += 1
    }
  }

  return { latencies, requests, errors, bytes }
}

async function runStage(
  url: string,
  workers: number,
): Promise<SSRLoadStageStats> {
  const start = performance.now()
  const deadline = Date.now() + STAGE_DURATION_MS
  const workerResults = await Promise.all(
    Array.from({ length: workers }, () => runWorker(url, deadline)),
  )
  const durationMs = performance.now() - start
  const latencies = workerResults.flatMap((result) => result.latencies)
  const requests = workerResults.reduce(
    (sum, result) => sum + result.requests,
    0,
  )
  const errors = workerResults.reduce((sum, result) => sum + result.errors, 0)
  const bytes = workerResults.reduce((sum, result) => sum + result.bytes, 0)
  const avgLatency =
    latencies.length > 0
      ? latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length
      : 0

  return {
    workers,
    durationMs: round(durationMs),
    requests,
    errors,
    requestsPerSec: round(requests / (durationMs / 1000)),
    avgLatencyMs: round(avgLatency),
    medianLatencyMs: round(percentile(latencies, 50)),
    p95LatencyMs: round(percentile(latencies, 95)),
    maxLatencyMs: round(latencies.length > 0 ? Math.max(...latencies) : 0),
    bytesPerSec: round(bytes / (durationMs / 1000)),
  }
}

export async function runLoadTest(url: string): Promise<SSRLoadTests> {
  const stages: SSRLoadStageStats[] = []

  for (const workers of WORKER_STAGES) {
    console.info(`  ${workers} workers for ${STAGE_DURATION_MS / 1000}s`)
    stages.push(await runStage(url, workers))
  }

  const peakStage = stages.reduce((best, stage) =>
    stage.requestsPerSec > best.requestsPerSec ? stage : best,
  )

  return {
    peakWorkers: peakStage.workers,
    peakRequestsPerSec: peakStage.requestsPerSec,
    peakAvgLatencyMs: peakStage.avgLatencyMs,
    peakP95LatencyMs: peakStage.p95LatencyMs,
    totalRequests: stages.reduce((sum, stage) => sum + stage.requests, 0),
    totalErrors: stages.reduce((sum, stage) => sum + stage.errors, 0),
    stages,
  }
}
