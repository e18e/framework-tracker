import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatThroughput } from './result-content.ts'
import type { FrameworkResult } from '@framework-tracker/results'
import {
  prepareSsrRequestThroughputTestsOpsPerSecComparison,
  prepareSsrRequestThroughputTestsLatencyMsComparison,
  prepareSsrRequestThroughputTestsOpsPerSecHistory,
} from './chart-measurements.ts'

const metric = (mean: number) => ({
  mean,
  median: mean,
  min: mean,
  max: mean,
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

test('throughput preparation uses run means without relabeling request medians', () => {
  const normalized = formatThroughput(
    benchmark as NonNullable<FrameworkResult['ssrRequestThroughputTests']>,
  )
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
