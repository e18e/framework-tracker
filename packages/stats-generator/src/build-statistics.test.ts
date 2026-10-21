import assert from 'node:assert/strict'
import test from 'node:test'
import { createBuildStats } from './build-statistics.ts'
import { BuildStatsSchema } from './schemas.ts'

test('build schema requires identity and complete iterations', () => {
  const result = createBuildStats(
    'astro',
    'packages/starter-astro',
    [10, 20, 30],
    [5],
  )
  for (const patch of [
    { runs: 2 },
    { iterations: undefined },
    { framework: undefined },
    { packagePath: undefined },
    { name: 'warmBuild' },
  ]) {
    assert.equal(
      BuildStatsSchema.safeParse({
        ...result,
        coldBuildTime: { ...result.coldBuildTime, ...patch },
      }).success,
      false,
    )
  }
})
