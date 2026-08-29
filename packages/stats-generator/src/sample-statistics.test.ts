import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { standardDeviation, summarizeSamples } from './sample-statistics.ts'

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
