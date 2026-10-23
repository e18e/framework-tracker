import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  standardDeviation,
  summarizeSamples,
  summarizeMetric,
} from './sample-statistics.ts'

describe('sample statistics', () => {
  it('keeps raw samples and calculates their summary', () => {
    assert.deepEqual(summarizeSamples([10, 12, 14, 16, 18]), {
      avgMs: 14,
      standardDeviationMs: 3.16,
      minMs: 10,
      maxMs: 18,
      samplesMs: [10, 12, 14, 16, 18],
    })
  })

  it('reports zero deviation for one sample', () => {
    assert.equal(standardDeviation([12]), 0)
  })

  it('rejects an empty sample set', () => {
    assert.throws(() => summarizeSamples([]), /empty sample set/)
  })
})

describe('metric summaries', () => {
  it('calculates mean, median and extrema without rounding', () => {
    assert.deepEqual(summarizeMetric([10, 20, 30]), {
      mean: 20,
      median: 20,
      min: 10,
      max: 30,
    })
    assert.equal(summarizeMetric([0, 1, 1]).mean, 2 / 3)
  })
  it('summarizes one sample', () => {
    assert.deepEqual(summarizeMetric([5]), {
      mean: 5,
      median: 5,
      min: 5,
      max: 5,
    })
  })
  it('rejects empty input', () => {
    assert.throws(() => summarizeMetric([]), /empty sample set/)
  })
})

it('summarizes large request sample populations without spreading arguments', () => {
  assert.deepEqual(summarizeMetric(Array.from({ length: 250_000 }, () => 5)), {
    mean: 5,
    median: 5,
    min: 5,
    max: 5,
  })
})

it('calculates odd and even medians without mutating raw measurements', () => {
  const odd = [9, 1, 2]
  const even = [20, 1, 9, 2]
  assert.equal(summarizeMetric(odd).median, 2)
  assert.equal(summarizeMetric(even).median, 5.5)
  assert.deepEqual(odd, [9, 1, 2])
  assert.deepEqual(even, [20, 1, 9, 2])
})
