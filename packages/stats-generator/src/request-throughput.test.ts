import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  assembleRequestThroughput,
  createRequestThroughputIteration,
  mergeRequestThroughputArtifact,
} from './request-throughput.ts'

const configuration = {
  bodySizeKb: 20.25,
  duplicationFactor: 1.25,
  durationMs: 10_000,
  warmupDurationMs: 250,
  minimumSamples: 64,
  warmupMinimumSamples: 16,
}
function fixture() {
  return assembleRequestThroughput(
    [
      createRequestThroughputIteration(
        [100.125, 300.375, 500.625],
        [1, 2, 9],
        2,
      ),
      createRequestThroughputIteration([1000.125], [0.25], 0.25),
    ],
    configuration,
  )
}

test('artifact merge validates before merging and preserves unrelated results and environment', () => {
  const current = {
    frameworkVersion: 'old',
    runner: 'current runner',
    browserVersion: 'current browser',
    testTimeMs: 123,
    timingMeasuredAt: '2026-10-22T00:00:00Z',
  }
  const artifact = {
    ssrRequestThroughputTests: fixture(),
    frameworkVersion: 'new',
    runner: 'artifact runner',
    browserVersion: 'stale browser',
    testTimeMs: 999,
  }
  const merged = mergeRequestThroughputArtifact(current, artifact)
  assert.deepEqual(merged, {
    ...current,
    frameworkVersion: 'new',
    ssrRequestThroughputTests: fixture(),
  })
  assert.throws(() =>
    mergeRequestThroughputArtifact(current, {
      ...artifact,
      ssrRequestThroughputTests: { ...fixture(), iterations: undefined },
    }),
  )
  const result = merged.ssrRequestThroughputTests!
  assert.ok('iterations' in result)
  assert.equal(result.samples, 4)
  assert.deepEqual(result.iterations[0].latencyMs, {
    mean: 4, min: 1, max: 9, variance: 19,
  })
  assert.equal(result.opsPerSec.mean, 650.25)
  assert.equal(result.avgLatencyMs.mean, 2.125)
  assert.equal(result.medianLatencyMs.mean, 1.125)
  assert.equal(JSON.stringify(result).includes('throughputSamples'), false)
  assert.equal(JSON.stringify(result).includes('latencySamplesMs'), false)
  assert.equal(current.frameworkVersion, 'old')
})
