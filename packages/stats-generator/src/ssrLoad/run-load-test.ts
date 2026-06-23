import autocannon from 'autocannon'
import type { SSRLoadStageStats, SSRLoadTests } from './types.ts'

const STAGE_DURATION_SECONDS = 5
const WORKER_STAGES = [1, 5, 10, 25, 50, 100, 200] as const

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

async function runStage(
  url: string,
  workers: number,
): Promise<SSRLoadStageStats> {
  const result = await autocannon({
    url,
    connections: workers,
    duration: STAGE_DURATION_SECONDS,
    headers: { Accept: 'text/html,application/xhtml+xml' },
    timeout: STAGE_DURATION_SECONDS + 5,
  })

  return {
    workers,
    durationMs: round(result.duration * 1000),
    requests: result.requests.total,
    errors: result.errors + result.timeouts + result.non2xx,
    requestsPerSec: round(result.requests.average),
    avgLatencyMs: round(result.latency.average),
    medianLatencyMs: round(result.latency.p50),
    p50LatencyMs: round(result.latency.p50),
    p75LatencyMs: round(result.latency.p75),
    p90LatencyMs: round(result.latency.p90),
    p99LatencyMs: round(result.latency.p99),
    maxLatencyMs: round(result.latency.max),
    bytesPerSec: round(result.throughput.average),
  }
}

export async function runLoadTest(url: string): Promise<SSRLoadTests> {
  const stages: SSRLoadStageStats[] = []

  for (const workers of WORKER_STAGES) {
    console.info(`  ${workers} workers for ${STAGE_DURATION_SECONDS}s`)
    stages.push(await runStage(url, workers))
  }

  const peakStage = stages.reduce((best, stage) =>
    stage.requestsPerSec > best.requestsPerSec ? stage : best,
  )

  return {
    peakWorkers: peakStage.workers,
    peakRequestsPerSec: peakStage.requestsPerSec,
    peakAvgLatencyMs: peakStage.avgLatencyMs,
    peakP50LatencyMs: peakStage.p50LatencyMs,
    peakP75LatencyMs: peakStage.p75LatencyMs,
    peakP90LatencyMs: peakStage.p90LatencyMs,
    peakP99LatencyMs: peakStage.p99LatencyMs,
    totalRequests: stages.reduce((sum, stage) => sum + stage.requests, 0),
    totalErrors: stages.reduce((sum, stage) => sum + stage.errors, 0),
    stages,
  }
}
