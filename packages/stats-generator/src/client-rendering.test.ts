import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assembleClientRendering } from './client-rendering.ts'
import {
  ClientRenderingBenchmarkSchema,
  ClientSideRenderedStatsSchema,
} from './schemas.ts'

test('assembles client rendering from exact raw browser measurements', () => {
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
  const result = assembleClientRendering(iterations)
  assert.deepEqual(result.iterations, iterations)
  assert.equal(result.firstPaintMs.mean, 2)
  assert.equal(result.interactionTests.source, 'lighthouse-inp-breakdown')
  assert.equal(
    ClientRenderingBenchmarkSchema.safeParse({
      ...result,
      iterations: undefined,
    }).success,
    false,
  )
  assert.equal(
    ClientSideRenderedStatsSchema.safeParse({
      browserVersion: 'Chrome',
      clientSideRenderedTests: { ...result, iterations: [] },
    }).success,
    false,
  )
})
