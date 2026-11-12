import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CombinedResultSchema,
  mergeProjectResult,
  projectResult,
} from '@framework-performance/results/storage'

test('combining projects preserves their independent measurements and metadata', () => {
  const starter = {
    frameworkVersion: '1.0.0',
    runner: 'starter-runner',
    productionDependencyCount: { value: 3, unit: 'count' },
  }
  const app = {
    frameworkVersion: '2.0.0',
    runner: 'app-runner',
    testTime: { value: 20, unit: 'ms' },
  }
  const first = mergeProjectResult(null, 'starter-astro', starter)
  const combined = mergeProjectResult(first, 'app-astro', app)
  assert.deepEqual(projectResult(combined, 'starter'), starter)
  assert.deepEqual(projectResult(combined, 'app'), app)
  assert.equal(combined.tests.productionDependencyCount?.project, 'starter')
  assert.equal(combined.tests.testTime?.project, 'app')
  const updated = mergeProjectResult(combined, 'starter-astro', {
    ...starter,
    productionDependencyCount: { value: 4, unit: 'count' },
  })
  assert.deepEqual(projectResult(updated, 'app'), app)
  assert.deepEqual(projectResult(first, 'starter'), starter)
})

test('combining results rejects invalid measurements and name collisions', () => {
  assert.throws(() =>
    mergeProjectResult(null, 'starter-astro', {
      productionDependencyCount: { value: -1, unit: 'count' },
    }),
  )
  const existing = mergeProjectResult(null, 'starter-astro', {
    testTime: { value: 1, unit: 'ms' },
  })
  assert.throws(
    () =>
      mergeProjectResult(existing, 'app-astro', {
        testTime: { value: 2, unit: 'ms' },
      }),
    /collision/,
  )
})

test('stored tests always validate their result and require project metadata', () => {
  const invalid = {
    framework: 'astro',
    projects: {},
    tests: {
      install: { project: 'starter', result: 'invalid install result' },
    },
  }
  assert.equal(CombinedResultSchema.safeParse(invalid).success, false)
  assert.equal(
    CombinedResultSchema.safeParse({ ...invalid, projects: { starter: {} } })
      .success,
    false,
  )
  const orphan = CombinedResultSchema.safeParse({
    framework: 'astro',
    projects: {},
    tests: {
      productionDependencyCount: {
        project: 'starter',
        result: { value: 3, unit: 'count' },
      },
    },
  })
  assert.equal(orphan.success, false)
  assert.ok(
    orphan.error?.issues.some(
      (issue) =>
        issue.path.join('.') === 'tests.productionDependencyCount.project',
    ),
  )
  assert.equal(
    CombinedResultSchema.safeParse({
      framework: 'astro',
      projects: { starter: {} },
      tests: {
        typo: { project: 'starter', result: { value: 3, unit: 'count' } },
      },
    }).success,
    false,
  )
})
