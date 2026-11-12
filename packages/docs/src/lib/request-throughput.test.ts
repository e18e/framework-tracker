import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatThroughput } from './result-content.ts'
import type { FrameworkResult } from '@framework-performance/results'
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
  iterations: [100, 100, 1000].map((operationThroughput, index) => ({
    operationThroughput: { ...metric(operationThroughput), unit: 'ops/s' },
    latency: { ...metric(index === 2 ? 40 : 4), median: 2, unit: 'ms' },
    samples: { value: 3, unit: 'requests' },
  })),
  operationThroughput: {
    mean: 400,
    median: 100,
    min: 100,
    max: 1000,
    unit: 'ops/s',
  },
  latency: { mean: 16, median: 4, min: 4, max: 40, unit: 'ms' },
  samples: { value: 9, unit: 'requests' },
  bodySize: { value: 20.5, unit: 'KiB' },
  duplicationFactor: { value: 1.25, unit: 'ratio' },
  durationMs: 10_000,
  warmupDurationMs: 250,
  minimumSamples: 64,
  warmupMinimumSamples: 16,
  source: 'tinybench',
  path: '/ssr-throughput',
} satisfies NonNullable<FrameworkResult['ssrRequestThroughputTests']>

test('throughput charts use the median of run means, not the mean or request median', () => {
  const normalized = formatThroughput(benchmark)
  assert.equal(normalized.operationThroughput, 100)
  assert.equal(normalized.latency, 4)
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
    operationThroughput: { value: 100, unit: 'ops/s' },
    avgLatency: { value: 4, unit: 'ms' },
    medianLatency: { value: 2, unit: 'ms' },
    samples: { value: 64, unit: 'requests' },
    bodySize: { value: 20, unit: 'KiB' },
    duplicationFactor: { value: 1, unit: 'ratio' },
  } satisfies NonNullable<FrameworkResult['ssrRequestThroughputTests']>
  const normalized = formatThroughput(legacy)
  assert.equal(normalized.latency, 4)
})
