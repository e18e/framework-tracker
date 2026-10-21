import assert from 'node:assert/strict'
import test from 'node:test'
import { createBuildStats } from './build-statistics.ts'
import { BuildStatsSchema } from './schemas.ts'

test('build schema requires identity and complete iterations', () => {
  const result = createBuildStats([10, 20, 30], [5])
  for (const benchmark of [result.coldBuildTime, result.warmBuildTime]) {
    assert.equal(Object.hasOwn(benchmark, 'framework'), false)
    assert.equal(Object.hasOwn(benchmark, 'packagePath'), false)
  }
  for (const patch of [
    { runs: 2 },
    { iterations: undefined },
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
