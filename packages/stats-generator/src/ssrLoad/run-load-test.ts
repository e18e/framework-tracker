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
  connections: number,
): Promise<SSRLoadStageStats> {
  const result = await autocannon({
    url,
    connections,
    duration: STAGE_DURATION_SECONDS,
    headers: { Accept: 'text/html,application/xhtml+xml' },
    timeout: STAGE_DURATION_SECONDS + 5,
  })

  return measureLoadStage({
    connections,
    duration: round(result.duration * 1000),
    requestCount: result.requests.total,
    errorCount: result.errors + result.timeouts + result.non2xx,
    requestThroughput: round(result.requests.average),
    avgLatency: round(result.latency.average),
    p50Latency: round(result.latency.p50),
    p75Latency: round(result.latency.p75),
    p90Latency: round(result.latency.p90),
    p99Latency: round(result.latency.p99),
    maxLatency: round(result.latency.max),
    byteThroughput: round(result.throughput.average),
  })
}

type RawLoadStage = { [K in keyof SSRLoadStageStats]: number }

export function measureLoadStage(stage: RawLoadStage): SSRLoadStageStats {
  return {
    connections: stage.connections,
    duration: { value: stage.duration, unit: 'ms' },
    requestCount: { value: stage.requestCount, unit: 'requests' },
    errorCount: { value: stage.errorCount, unit: 'errors' },
    requestThroughput: { value: stage.requestThroughput, unit: 'requests/s' },
    avgLatency: { value: stage.avgLatency, unit: 'ms' },
    p50Latency: { value: stage.p50Latency, unit: 'ms' },
    p75Latency: { value: stage.p75Latency, unit: 'ms' },
    p90Latency: { value: stage.p90Latency, unit: 'ms' },
    p99Latency: { value: stage.p99Latency, unit: 'ms' },
    maxLatency: { value: stage.maxLatency, unit: 'ms' },
    byteThroughput: { value: stage.byteThroughput, unit: 'bytes/s' },
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
      if (warmup.errorCount.value === 0 && warmup.requestCount.value > 0) break

      const details = `sweep ${run}/${measurements[getSSRLoadKind()].runs}, attempt ${attempt}/${WARMUP_ATTEMPTS}: ${warmup.requestCount.value} requests, ${warmup.errorCount.value} errors, ${warmup.duration.value}ms`
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
    for (const connections of WORKER_STAGES) {
      console.info(
        `  ${connections} connections for ${STAGE_DURATION_SECONDS}s`,
      )
      const stage = await measureStage(url, connections)
      console.info(
        `    ${stage.requestCount.value} requests, ${stage.errorCount.value} errors, ${stage.requestThroughput.value} req/s`,
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
    'requestCount',
    'errorCount',
    'requestThroughput',
    'avgLatency',
    'p50Latency',
    'p75Latency',
    'p90Latency',
    'p99Latency',
    'maxLatency',
    'byteThroughput',
  ] as const
  const connections = samples[0]!.map((stage) => stage.connections)
  if (
    new Set(connections).size !== connections.length ||
    samples.some(
      (sweep) =>
        sweep.length !== connections.length ||
        sweep.some((stage, index) => stage.connections !== connections[index]),
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
    configuration: { stageConnections: connections },
    totalRequestCount: {
      value: samples.reduce(
        (sum, sweep) =>
          sum +
          sweep.reduce((count, stage) => count + stage.requestCount.value, 0),
        0,
      ),
      unit: 'requests',
    },
    totalErrorCount: {
      value: samples.reduce(
        (sum, sweep) =>
          sum +
          sweep.reduce((count, stage) => count + stage.errorCount.value, 0),
        0,
      ),
      unit: 'errors',
    },
    ...Object.fromEntries(
      connections.map((connections, index) => [
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
