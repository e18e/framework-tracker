import { getLoadPeakStage, selectRepresentativeIteration } from './selection.ts'
import { SSRLoadTestsSchema } from '../schemas.ts'
import { summarizeMetric } from '../sample-statistics.ts'
import { getSSRLoadKind } from './config.ts'
import { setTimeout as delay } from 'node:timers/promises'
import autocannon from 'autocannon'
import type { SSRLoadStageStats, SSRLoadSweep, SSRLoadTests } from './types.ts'

const STAGE_DURATION_SECONDS = 5
const LOAD_SWEEP_COUNT = 3
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

  return {
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
  }
}

export async function runLoadTest(
  url: string,
  measureStage: typeof runStage = runStage,
  pause: (ms: number) => Promise<void> = delay,
): Promise<SSRLoadTests> {
  const samples: SSRLoadSweep[] = []
  for (let run = 1; run <= LOAD_SWEEP_COUNT; run++) {
    if (run > 1) {
      console.info(
        `  Sweep ${run}/${LOAD_SWEEP_COUNT}: recovering for ${RECOVERY_MS / 1000}s`,
      )
      await pause(RECOVERY_MS)
    }
    for (let attempt = 1; attempt <= WARMUP_ATTEMPTS; attempt++) {
      console.info(
        `  Sweep ${run}/${LOAD_SWEEP_COUNT}: warm-up ${attempt}/${WARMUP_ATTEMPTS} for ${STAGE_DURATION_SECONDS}s`,
      )
      const warmup = await measureStage(url, WORKER_STAGES[0])
      if (warmup.errors === 0 && warmup.requests > 0) break

      const details = `sweep ${run}/${LOAD_SWEEP_COUNT}, attempt ${attempt}/${WARMUP_ATTEMPTS}: ${warmup.requests} requests, ${warmup.errors} errors, ${warmup.elapsedTimeMs}ms`
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
        `    ${stage.requests} requests, ${stage.errors} errors, ${stage.requestsPerSec} req/s`,
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
    totalRequests: samples.reduce(
      (sum, sweep) =>
        sum + sweep.reduce((count, stage) => count + stage.requests, 0),
      0,
    ),
    totalErrors: samples.reduce(
      (sum, sweep) =>
        sum + sweep.reduce((count, stage) => count + stage.errors, 0),
      0,
    ),
    ...Object.fromEntries(
      workers.map((connections, index) => [
        `stage${index + 1}`,
        {
          connections,
          ...Object.fromEntries(
            fields.map((field) => [
              field,
              summarizeMetric(samples.map((sweep) => sweep[index]![field])),
            ]),
          ),
        },
      ]),
    ),
  })
}
