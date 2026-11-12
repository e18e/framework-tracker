import { measurements } from '../measurements.ts'
import {
  getLoadPeakStage,
  selectRepresentativeIteration,
} from '@framework-performance/results/selection'
import { SSRLoadTestsSchema } from '@framework-performance/results'
import { summarizeMetric } from '../sample-statistics.ts'
import { getSSRLoadKind } from './config.ts'
import { setTimeout as delay } from 'node:timers/promises'
import autocannon from 'autocannon'
import type { SSRLoadStageStats, SSRLoadSweep, SSRLoadTests } from './types.ts'

const STAGE_DURATION_SECONDS = 5

const WARMUP_ATTEMPTS = 3
const RECOVERY_MS = 5000
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

  return measureLoadStage({
    workers,
    elapsedTimeMs: round(result.duration * 1000),
    requests: result.requests.total,
    errors: result.errors + result.timeouts + result.non2xx,
    requestsPerSec: round(result.requests.average),
    avgLatencyMs: round(result.latency.average),
    p50LatencyMs: round(result.latency.p50),
    p75LatencyMs: round(result.latency.p75),
    p90LatencyMs: round(result.latency.p90),
    p99LatencyMs: round(result.latency.p99),
    maxLatencyMs: round(result.latency.max),
    bytesPerSec: round(result.throughput.average),
  })
}

type RawLoadStage = { [K in keyof SSRLoadStageStats]: number }

export function measureLoadStage(stage: RawLoadStage): SSRLoadStageStats {
  return {
    workers: stage.workers,
    elapsedTimeMs: { value: stage.elapsedTimeMs, unit: 'ms' },
    requests: { value: stage.requests, unit: 'requests' },
    errors: { value: stage.errors, unit: 'errors' },
    requestsPerSec: { value: stage.requestsPerSec, unit: 'requests/s' },
    avgLatencyMs: { value: stage.avgLatencyMs, unit: 'ms' },
    p50LatencyMs: { value: stage.p50LatencyMs, unit: 'ms' },
    p75LatencyMs: { value: stage.p75LatencyMs, unit: 'ms' },
    p90LatencyMs: { value: stage.p90LatencyMs, unit: 'ms' },
    p99LatencyMs: { value: stage.p99LatencyMs, unit: 'ms' },
    maxLatencyMs: { value: stage.maxLatencyMs, unit: 'ms' },
    bytesPerSec: { value: stage.bytesPerSec, unit: 'bytes/s' },
  }
}

export async function runLoadTest(
  url: string,
  measureStage: typeof runStage = runStage,
  pause: (ms: number) => Promise<void> = delay,
): Promise<SSRLoadTests> {
  const samples: SSRLoadSweep[] = []
  for (let run = 1; run <= measurements[getSSRLoadKind()].runs; run++) {
    if (run > 1) {
      console.info(
        `  Sweep ${run}/${measurements[getSSRLoadKind()].runs}: recovering for ${RECOVERY_MS / 1000}s`,
      )
      await pause(RECOVERY_MS)
    }
    for (let attempt = 1; attempt <= WARMUP_ATTEMPTS; attempt++) {
      console.info(
        `  Sweep ${run}/${measurements[getSSRLoadKind()].runs}: warm-up ${attempt}/${WARMUP_ATTEMPTS} for ${STAGE_DURATION_SECONDS}s`,
      )
      const warmup = await measureStage(url, WORKER_STAGES[0])
      if (warmup.errors.value === 0 && warmup.requests.value > 0) break

      const details = `sweep ${run}/${measurements[getSSRLoadKind()].runs}, attempt ${attempt}/${WARMUP_ATTEMPTS}: ${warmup.requests.value} requests, ${warmup.errors.value} errors, ${warmup.elapsedTimeMs.value}ms`
      if (attempt === WARMUP_ATTEMPTS) {
        throw new Error(
          `SSR load warm-up failed (${details}); expected requests without errors after recovery.`,
        )
      }
      console.warn(
        `  Unhealthy warm-up (${details}); recovering for ${RECOVERY_MS / 1000}s before retry.`,
      )
      await pause(RECOVERY_MS)
    }
    const stages: SSRLoadStageStats[] = []
    for (const workers of WORKER_STAGES) {
      console.info(`  ${workers} workers for ${STAGE_DURATION_SECONDS}s`)
      const stage = await measureStage(url, workers)
      console.info(
        `    ${stage.requests.value} requests, ${stage.errors.value} errors, ${stage.requestsPerSec.value} req/s`,
      )
      stages.push(stage)
    }
    getLoadPeakStage(stages)
    samples.push(stages)
  }
  const result = summarizeLoadSweeps(
    samples,
    getSSRLoadKind(),
    new URL(url).pathname as SSRLoadTests['path'],
  )
  return SSRLoadTestsSchema.parse({
    ...result,
    configuration: {
      ...result.configuration,
      recoveryMs: RECOVERY_MS,
      warmupAttempts: WARMUP_ATTEMPTS,
      stageDurationMs: STAGE_DURATION_SECONDS * 1000,
      warmupDurationMs: STAGE_DURATION_SECONDS * 1000,
    },
  })
}

/** Keep a real sweep's internally consistent metrics, selected by median peak throughput. */
export function summarizeLoadSweeps(
  samples: readonly SSRLoadSweep[],
  name: SSRLoadTests['name'] = 'ssrLoad',
  path: SSRLoadTests['path'] = '/server-side-rendered',
): SSRLoadTests {
  if (samples.length === 0 || samples.length % 2 === 0) {
    throw new Error('Expected an odd, nonzero number of load sweeps.')
  }
  const representativeIterationIndex = selectRepresentativeIteration(samples)
  const fields = [
    'requests',
    'errors',
    'requestsPerSec',
    'avgLatencyMs',
    'p50LatencyMs',
    'p75LatencyMs',
    'p90LatencyMs',
    'p99LatencyMs',
    'maxLatencyMs',
    'bytesPerSec',
  ] as const
  const workers = samples[0]!.map((stage) => stage.workers)
  if (
    new Set(workers).size !== workers.length ||
    samples.some(
      (sweep) =>
        sweep.length !== workers.length ||
        sweep.some((stage, index) => stage.workers !== workers[index]),
    )
  )
    throw new Error('Expected matching worker stages in every sweep')
  return SSRLoadTestsSchema.parse({
    name,
    path,
    source: 'autocannon',
    runs: samples.length,
    iterations: [...samples],
    representativeIterationIndex,
    configuration: { workerStages: workers },
    totalRequests: {
      value: samples.reduce(
        (sum, sweep) =>
          sum + sweep.reduce((count, stage) => count + stage.requests.value, 0),
        0,
      ),
      unit: 'requests',
    },
    totalErrors: {
      value: samples.reduce(
        (sum, sweep) =>
          sum + sweep.reduce((count, stage) => count + stage.errors.value, 0),
        0,
      ),
      unit: 'errors',
    },
    ...Object.fromEntries(
      workers.map((connections, index) => [
        `stage${index + 1}`,
        {
          connections,
          ...Object.fromEntries(
            fields.map((field) => [
              field,
              summarizeMetric(
                samples.map((sweep) => sweep[index]![field].value),
              ),
            ]),
          ),
        },
      ]),
    ),
  })
}
