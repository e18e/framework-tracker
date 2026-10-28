import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatThroughput } from './result-content.ts'
import type { FrameworkResult } from '@framework-tracker/results'
import {
  prepareSsrRequestThroughputTestsOpsPerSecComparison,
  prepareSsrRequestThroughputTestsLatencyMsComparison,
  prepareSsrRequestThroughputTestsOpsPerSecHistory,
  prepareSsrRequestThroughputTestsLatencyMsHistory,
} from './chart-measurements.ts'

const metric = (mean: number) => ({
  mean,
  median: mean,
  min: mean,
  max: mean,
})
const benchmark = {
  name: 'ssrRequestThroughput',
  runs: 3,
  iterations: [100, 100, 1000].map((opsPerSec, index) => ({
    opsPerSec: metric(opsPerSec),
    latencyMs: { ...metric(index === 2 ? 40 : 4), median: 2 },
    samples: 3,
  })),
  opsPerSec: { mean: 400, median: 100, min: 100, max: 1000 },
  latencyMs: { mean: 16, median: 4, min: 4, max: 40 },
  samples: 9,
  bodySizeKb: 20.5,
  duplicationFactor: 1.25,
  durationMs: 10_000,
  warmupDurationMs: 250,
  minimumSamples: 64,
  warmupMinimumSamples: 16,
  source: 'tinybench',
  path: '/ssr-throughput',
}

test('throughput charts use the median of run means, not the mean or request median', () => {
  const normalized = formatThroughput(
    benchmark as NonNullable<FrameworkResult['ssrRequestThroughputTests']>,
  )
  assert.equal(normalized.opsPerSec, 100)
  assert.equal(normalized.latencyMs, 4)
  const records = [
    { package: 'app-astro', ssrRequestThroughputTests: normalized },
  ]
  assert.equal(
    prepareSsrRequestThroughputTestsOpsPerSecComparison(records).data[0]?.value,
    100,
  )
  assert.equal(
    prepareSsrRequestThroughputTestsLatencyMsComparison(records).data[0]?.value,
    4,
  )
  assert.equal(
    prepareSsrRequestThroughputTestsOpsPerSecHistory(records).data[0]?.value,
    100,
  )
  const latencyHistory =
    prepareSsrRequestThroughputTestsLatencyMsHistory(records)
  assert.equal(latencyHistory.data[0]?.value, 4)
  assert.equal(latencyHistory.title, 'Median Latency')
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
  const normalized = formatThroughput(legacy)
  assert.equal(normalized.latencyMs, 4)
})
