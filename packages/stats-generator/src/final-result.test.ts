import assert from 'node:assert/strict'
import { globSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { FrameworkResultSchema } from '@framework-tracker/results'
import {
  CombinedResultSchema,
  resultsRoot,
} from '@framework-tracker/results/storage'

test('shared final contract accepts every persisted result and history', () => {
  const files = [
    ...globSync(['*/latest.json', '*/versions/*.json'], { cwd: resultsRoot }),
  ]
  assert.ok(files.length > 0)
  for (const file of files) {
    const result = CombinedResultSchema.safeParse(
      JSON.parse(readFileSync(join(resultsRoot, file), 'utf8')),
    )
    assert.ok(result.success, `${file}: ${result.error?.message}`)
  }
})

test('final contract validates nested benchmarks and test identity', () => {
  assert.equal(
    FrameworkResultSchema.safeParse({
      install: {
        name: 'install',
        runs: 2,
        iterations: [{ installTimeMs: 10 }],
        installTimeMs: { mean: 10, median: 10, min: 10, max: 10 },
        nodeModulesSizeBytes: 100,
      },
    }).success,
    false,
  )
  assert.equal(
    FrameworkResultSchema.safeParse({
      ssrRouterLinkLoadTests: { name: 'ssrLoad' },
    }).success,
    false,
  )
})
