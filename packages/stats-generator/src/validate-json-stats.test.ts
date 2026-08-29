import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { StarterCIStatsSchema, AppCIStatsSchema } from './schemas.ts'

describe('Stats Validation Schemas', () => {
  it('validates a valid starter ci-stats payload', () => {
    const validStarter = {
      timingMeasuredAt: '2026-08-29T05:27:13.181Z',
      runner: 'Depot runner',
      frameworkVersion: '7.1.6',
      installTime: {
        avgMs: 2759.2,
        standardDeviationMs: 679,
        minMs: 1671,
        maxMs: 3464,
        samplesMs: [1671, 2624, 2947, 3464, 3090],
      },
      coldBuildTime: {
        avgMs: 797.8,
        standardDeviationMs: 5.07,
        minMs: 793,
        maxMs: 805,
        samplesMs: [801, 805, 794, 796, 793],
      },
      warmBuildTime: {
        avgMs: 764,
        standardDeviationMs: 6.2,
        minMs: 757,
        maxMs: 774,
        samplesMs: [763, 774, 764, 757, 762],
      },
      nodeModulesSize: 218034176,
      buildOutputSize: 32768,
      prodDependencies: 1,
      devDependencies: 2,
      allDependencies: 387,
    }

    const result = StarterCIStatsSchema.safeParse(validStarter)
    assert.equal(result.success, true)
  })

  it('rejects starter stats with zero nodeModulesSize or missing installTime', () => {
    const invalidStarter = {
      timingMeasuredAt: '2026-08-29T05:27:13.181Z',
      runner: 'Depot runner',
      frameworkVersion: '7.1.6',
      nodeModulesSize: 0,
      buildOutputSize: 32768,
      prodDependencies: 1,
      devDependencies: 2,
      allDependencies: 387,
    }

    const result = StarterCIStatsSchema.safeParse(invalidStarter)
    assert.equal(result.success, false)
  })

  it('validates app stats with throughput or render tests', () => {
    const validApp = {
      timingMeasuredAt: '2026-08-29T05:27:13.181Z',
      runner: 'Depot runner',
      frameworkVersion: '7.1.6',
      ssrRequestThroughputTests: {
        opsPerSec: 1540.5,
        avgLatencyMs: 0.65,
        medianLatencyMs: 0.61,
        samples: 100,
        bodySizeKb: 14.2,
        duplicationFactor: 1,
      },
    }

    const result = AppCIStatsSchema.safeParse(validApp)
    assert.equal(result.success, true)
  })

  it('rejects app stats with no benchmark tests', () => {
    const emptyApp = {
      timingMeasuredAt: '2026-08-29T05:27:13.181Z',
      runner: 'Depot runner',
      frameworkVersion: '7.1.6',
    }

    const result = AppCIStatsSchema.safeParse(emptyApp)
    assert.equal(result.success, false)
  })
})
