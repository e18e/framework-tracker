import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  assembleRequestThroughput,
  createRequestThroughputIteration,
  mergeRequestThroughputArtifact,
} from './request-throughput.ts'

const configuration = {
  bodySize: { value: 20.25, unit: 'KiB' as const },
  duplicationFactor: { value: 1.25, unit: 'ratio' as const },
  durationMs: 10_000,
  warmupDurationMs: 250,
  minimumRequestCount: 64,
  warmupMinimumRequestCount: 16,
}
function fixture() {
  return assembleRequestThroughput(
    [
      createRequestThroughputIteration([100.125, 300.375, 500.625], [1, 2, 9]),
      createRequestThroughputIteration([1000.125], [0.25]),
    ],
    configuration,
  )
}

test('artifact merge validates before merging and preserves unrelated results and environment', () => {
  const current = {
    frameworkVersion: 'old',
    runner: 'current runner',
    browserVersion: 'current browser',
    testTime: { value: 123, unit: 'ms' as const },
    timingMeasuredAt: '2026-10-22T00:00:00Z',
  }
  const artifact = {
    ssrRequestThroughput: fixture(),
    frameworkVersion: 'new',
    runner: 'artifact runner',
    browserVersion: 'stale browser',
    testTime: { value: 999, unit: 'ms' as const },
  }
  const merged = mergeRequestThroughputArtifact(current, artifact)
  assert.deepEqual(merged, {
    ...current,
    frameworkVersion: 'new',
    ssrRequestThroughput: fixture(),
  })
  assert.throws(() =>
    mergeRequestThroughputArtifact(current, {
      ...artifact,
      ssrRequestThroughput: { ...fixture(), iterations: undefined },
    }),
  )
  const result = merged.ssrRequestThroughput!
  assert.ok('iterations' in result)
  assert.deepEqual(result.totalRequestCount, { value: 4, unit: 'requests' })
  assert.deepEqual(result.iterations[0].latency, {
    unit: 'ms',
    mean: 4,
    median: 2,
    min: 1,
    max: 9,
  })
  assert.equal(result.requestThroughput.mean, 650.25)
  assert.equal(result.latency.mean, 2.125)
  assert.equal(result.latency.median, 2.125)
  assert.equal('avgLatency' in result, false)
  assert.equal('medianLatency' in result, false)
  assert.equal('medianLatency' in result.iterations[0], false)
  assert.equal(JSON.stringify(result).includes('throughputSamples'), false)
  assert.equal(JSON.stringify(result).includes('latencySamplesMs'), false)
  assert.equal(current.frameworkVersion, 'old')
})
