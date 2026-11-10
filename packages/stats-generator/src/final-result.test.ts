import assert from 'node:assert/strict'
import { globSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  FrameworkResultSchema,
  MetricBaseSchema,
} from '@framework-performance/results'
import {
  CombinedResultSchema,
  resultsRoot,
} from '@framework-performance/results/storage'

function assertStoredUnits(value: unknown, path: string): void {
  if (Array.isArray(value)) {
    value.forEach((child, index) =>
      assertStoredUnits(child, `${path}.${index}`),
    )
    return
  }
  if (value === null || typeof value !== 'object') return
  const object = value as Record<string, unknown>
  if (
    ['mean', 'median', 'min', 'max'].every(
      (key) => typeof object[key] === 'number',
    )
  ) {
    assert.ok(
      MetricBaseSchema.safeParse(object).success,
      `${path}: expected an explicit metric unit in the stored JSON`,
    )
  }
  for (const [key, child] of Object.entries(object))
    assertStoredUnits(child, `${path}.${key}`)
}

test('every persisted result and history validates with explicit metric units', () => {
  const files = [...globSync('**/*.json', { cwd: resultsRoot })]
  assert.ok(files.length > 0)
  for (const file of files) {
    const stored = JSON.parse(readFileSync(join(resultsRoot, file), 'utf8'))
    const result = CombinedResultSchema.safeParse(stored)
    assert.ok(result.success, `${file}: ${result.error?.message}`)
    assertStoredUnits(stored, file)
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
