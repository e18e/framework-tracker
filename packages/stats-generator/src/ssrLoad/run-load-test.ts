import { measurementsConfig } from '../measurements.ts'
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

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

async function runStage(
  url: string,
  connections: number,
  durationSeconds: number,
): Promise<SSRLoadStageStats> {
  const result = await autocannon({
    url,
    connections,
    duration: durationSeconds,
    headers: { Accept: 'text/html,application/xhtml+xml' },
    timeout: durationSeconds + 5,
  })

  return measureLoadStage({
    connections,
    duration: round(result.duration * 1000),
    requests: result.requests.total,
    errors: result.errors + result.timeouts + result.non2xx,
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
    requests: { value: stage.requests, unit: 'requests' },
    errors: { value: stage.errors, unit: 'errors' },
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
  const kind = getSSRLoadKind()
  const {
    runs,
    stageConnections,
    stageDurationMs,
    warmupDurationMs,
    warmupAttempts,
    recoveryMs,
  } = measurementsConfig[kind]
  const samples: SSRLoadSweep[] = []
  for (let run = 1; run <= runs; run++) {
    if (run > 1) {
      console.info(
        `  Sweep ${run}/${runs}: recovering for ${recoveryMs / 1000}s`,
      )
      await pause(recoveryMs)
    }
    for (let attempt = 1; attempt <= warmupAttempts; attempt++) {
      console.info(
        `  Sweep ${run}/${runs}: warm-up ${attempt}/${warmupAttempts} for ${warmupDurationMs / 1000}s`,
      )
      const warmup = await measureStage(
        url,
        stageConnections[0],
        warmupDurationMs / 1000,
      )
      if (warmup.errors.value === 0 && warmup.requests.value > 0) break

      const details = `sweep ${run}/${runs}, attempt ${attempt}/${warmupAttempts}: ${warmup.requests.value} requests, ${warmup.errors.value} errors, ${warmup.duration.value}ms`
      if (attempt === warmupAttempts) {
        throw new Error(
          `SSR load warm-up failed (${details}); expected requests without errors after recovery.`,
        )
      }
      console.warn(
        `  Unhealthy warm-up (${details}); recovering for ${recoveryMs / 1000}s before retry.`,
      )
      await pause(recoveryMs)
    }
    const stages: SSRLoadStageStats[] = []
    for (const connections of stageConnections) {
      console.info(
        `  ${connections} connections for ${stageDurationMs / 1000}s`,
      )
      const stage = await measureStage(url, connections, stageDurationMs / 1000)
      console.info(
        `    ${stage.requests.value} requests, ${stage.errors.value} errors, ${stage.requestThroughput.value} req/s`,
      )
      stages.push(stage)
    }
    getLoadPeakStage(stages)
    samples.push(stages)
  }
  return summarizeLoadSweeps(samples, kind)
}

/** Keep a real sweep's internally consistent metrics, selected by median peak throughput. */
export function summarizeLoadSweeps(
  samples: readonly SSRLoadSweep[],
  name: SSRLoadTests['name'] = 'ssrLoad',
): SSRLoadTests {
  if (samples.length === 0 || samples.length % 2 === 0) {
    throw new Error('Expected an odd, nonzero number of load sweeps.')
  }
  const representativeIterationIndex = selectRepresentativeIteration(samples)
  const fields = [
    'requests',
    'errors',
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
    runs: samples.length,
    iterations: [...samples],
    representativeIterationIndex,
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
