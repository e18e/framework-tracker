import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assembleClientRendering } from './client-rendering.ts'
import {
  ClientRenderingBenchmarkSchema,
  ClientSideRenderedStatsSchema,
} from '@framework-performance/results'

test('assembles client rendering from exact raw browser measurements', () => {
  const iterations = [1, 3].map((value) => ({
    firstPaint: value,
    fcp: value + 1,
    interactionTests: {
      interactionLatency: value,
      inputDelay: 0,
      processingDuration: value,
      presentationDelay: 0,
    },
  }))
  const result = assembleClientRendering(iterations)
  assert.deepEqual(
    result.iterations.map(({ firstPaint }) => firstPaint),
    [
      { value: 1, unit: 'ms' },
      { value: 3, unit: 'ms' },
    ],
  )
  assert.equal(result.firstPaint.mean, 2)
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
