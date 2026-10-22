import assert from 'node:assert/strict'
import { test } from 'node:test'
import { requestThroughputContentSchema } from './request-throughput.ts'
import {
  prepareSsrRequestThroughputTestsOpsPerSecComparison,
  prepareSsrRequestThroughputTestsMedianLatencyMsComparison,
  prepareSsrRequestThroughputTestsOpsPerSecHistory,
} from './prepare-chart.ts'

const metric = (mean: number) => ({ mean, min: mean, max: mean, variance: 0 })
const benchmark = {
  name: 'ssrRequestThroughput',
  runs: 1,
  iterations: [
    {
      opsPerSec: metric(100.125),
      latencyMs: metric(4),
      medianLatencyMs: 2,
      samples: 3,
    },
  ],
  opsPerSec: metric(100.125),
  avgLatencyMs: metric(4),
  medianLatencyMs: metric(2),
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

test('content loader normalizes arithmetic means and keeps median latency separate', () => {
  const normalized = requestThroughputContentSchema.parse(benchmark)
  assert.equal(normalized.opsPerSec, 100.125)
  assert.equal(normalized.avgLatencyMs, 4)
  assert.equal(normalized.medianLatencyMs, 2)
  const records = [
    { package: 'app-astro', ssrRequestThroughputTests: normalized },
  ]
  assert.equal(
    prepareSsrRequestThroughputTestsOpsPerSecComparison(records).data[0]?.value,
    100.125,
  )
  assert.equal(
    prepareSsrRequestThroughputTestsMedianLatencyMsComparison(records).data[0]
      ?.value,
    2,
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

