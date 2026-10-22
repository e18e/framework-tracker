import assert from 'node:assert/strict'
import { test } from 'node:test'
import { requestThroughputContentSchema } from './request-throughput.ts'
import {
  prepareSsrRequestThroughputTestsOpsPerSecComparison,
  prepareSsrRequestThroughputTestsLatencyMsComparison,
  prepareSsrRequestThroughputTestsOpsPerSecHistory,
} from './prepare-chart.ts'

const metric = (mean: number) => ({
  mean,
  median: mean,
  min: mean,
  max: mean,
  variance: 0,
})
const benchmark = {
  name: 'ssrRequestThroughput',
  runs: 1,
  iterations: [
    {
      opsPerSec: metric(100.125),
      latencyMs: { ...metric(4), median: 2 },
      samples: 3,
    },
  ],
  opsPerSec: metric(100.125),
  latencyMs: metric(4),
  samples: 3,
  bodySizeKb: 20.5,
  duplicationFactor: 1.25,
  durationMs: 10_000,
  warmupDurationMs: 250,
  minimumSamples: 64,
  warmupMinimumSamples: 16,
  source: 'tinybench',
  path: '/ssr-throughput',
}

test('content loader uses run means without relabeling request medians', () => {
  const normalized = requestThroughputContentSchema.parse(benchmark)
  assert.equal(normalized.opsPerSec, 100.125)
  assert.equal(normalized.latencyMs, 4)
  const records = [
    { package: 'app-astro', ssrRequestThroughputTests: normalized },
  ]
  assert.equal(
    prepareSsrRequestThroughputTestsOpsPerSecComparison(records).data[0]?.value,
    100.125,
  )
  assert.equal(
    prepareSsrRequestThroughputTestsLatencyMsComparison(records).data[0]?.value,
    4,
  )
  assert.equal(
    prepareSsrRequestThroughputTestsOpsPerSecHistory(records).data[0]?.value,
    100.125,
  )
  assert.equal(
    requestThroughputContentSchema.safeParse({ ...benchmark, iterations: [] })
      .success,
    false,
  )
})

test('legacy mean latency remains distinct from the reported request median', () => {
  const legacy = {
    opsPerSec: 100,
    avgLatencyMs: 4,
    medianLatencyMs: 2,
    samples: 64,
    bodySizeKb: 20,
    duplicationFactor: 1,
  }
  const normalized = requestThroughputContentSchema.parse(legacy)
  assert.equal(normalized.latencyMs, 4)
})
