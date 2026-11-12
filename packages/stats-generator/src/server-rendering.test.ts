import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assembleServerRendering } from './server-rendering.ts'
import {
  ServerRenderingBenchmarkSchema,
  ServerSideRenderedStatsSchema,
} from '@framework-performance/results'

test('assembles server rendering from exact raw browser measurements', () => {
  const iterations = [1, 3].map((value) => ({
    firstPaintMs: value,
    fcpMs: value + 1,
    interactionTests: {
      interactionLatencyMs: value,
      inputDelayMs: 0,
      processingDurationMs: value,
      presentationDelayMs: 0,
    },
  }))
  const result = assembleServerRendering(iterations)
  assert.deepEqual(
    result.iterations.map(({ firstPaintMs }) => firstPaintMs),
    [
      { value: 1, unit: 'ms' },
      { value: 3, unit: 'ms' },
    ],
  )
  assert.equal(result.firstPaintMs.mean, 2)
  assert.equal(result.interactionTests.source, 'lighthouse-inp-breakdown')
  assert.equal(
    ServerRenderingBenchmarkSchema.safeParse({
      ...result,
      iterations: undefined,
    }).success,
    false,
  )
  assert.equal(
    ServerSideRenderedStatsSchema.safeParse({
      browserVersion: 'Chrome',
      serverSideRenderedTests: { ...result, iterations: [] },
    }).success,
    false,
  )
})
