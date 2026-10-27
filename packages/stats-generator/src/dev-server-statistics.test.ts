import assert from 'node:assert/strict'
import test from 'node:test'
import { createDevServerStats } from './dev-server-statistics.ts'
import { DevServerStatsSchema } from '@framework-tracker/results'

test('startup results retain iterations and summarize measurements', () => {
  assert.deepEqual(createDevServerStats([10, 20, 30]), {
    devServerStartTime: {
      name: 'devServer',
      runs: 3,
      iterations: [{ timeMs: 10 }, { timeMs: 20 }, { timeMs: 30 }],
      timeMs: { mean: 20, median: 20, min: 10, max: 30 },
    },
  })
})

test('startup schema requires its test name, complete runs, and statistics', () => {
  const result = createDevServerStats([10, 20, 30])
  for (const patch of [
    { name: undefined },
    { name: 'coldBuild' },
    { runs: 0 },
    { runs: 1.5 },
    { runs: 2 },
    { iterations: undefined },
    { iterations: [{ timeMs: -1 }, { timeMs: 20 }, { timeMs: 30 }] },
    { timeMs: { mean: 20, min: 10, max: 30 } },
  ]) {
    assert.equal(
      DevServerStatsSchema.safeParse({
        devServerStartTime: { ...result.devServerStartTime, ...patch },
      }).success,
      false,
    )
  }
  assert.equal(
    DevServerStatsSchema.safeParse({
      devServerStartTime: { avgMs: 20, minMs: 10, maxMs: 30 },
    }).success,
    false,
  )
  assert.throws(() => createDevServerStats([]))
})
