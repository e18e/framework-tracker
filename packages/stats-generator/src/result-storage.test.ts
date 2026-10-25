import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CombinedResultSchema,
  mergeProjectResult,
  projectResult,
} from '@framework-tracker/results/storage'

test('combining projects preserves their independent measurements and metadata', () => {
  const starter = {
    frameworkVersion: '1.0.0',
    runner: 'starter-runner',
    prodDependencies: 3,
  }
  const app = {
    frameworkVersion: '2.0.0',
    runner: 'app-runner',
    testTimeMs: 20,
  }
  const first = mergeProjectResult(null, 'starter-astro', starter)
  const combined = mergeProjectResult(first, 'app-astro', app)
  assert.deepEqual(projectResult(combined, 'starter'), starter)
  assert.deepEqual(projectResult(combined, 'app'), app)
  assert.equal(combined.tests.prodDependencies?.project, 'starter')
  assert.equal(combined.tests.testTimeMs?.project, 'app')
  const updated = mergeProjectResult(combined, 'starter-astro', {
    ...starter,
    prodDependencies: 4,
  })
  assert.deepEqual(projectResult(updated, 'app'), app)
  assert.deepEqual(projectResult(first, 'starter'), starter)
})

test('combining results rejects invalid measurements and name collisions', () => {
  assert.throws(() =>
    mergeProjectResult(null, 'starter-astro', { prodDependencies: -1 }),
  )
  const existing = mergeProjectResult(null, 'starter-astro', { testTimeMs: 1 })
  assert.throws(
    () => mergeProjectResult(existing, 'app-astro', { testTimeMs: 2 }),
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
    tests: { prodDependencies: { project: 'starter', result: 3 } },
  })
  assert.equal(orphan.success, false)
  assert.ok(
    orphan.error?.issues.some(
      (issue) => issue.path.join('.') === 'tests.prodDependencies.project',
    ),
  )
  assert.equal(
    CombinedResultSchema.safeParse({
      framework: 'astro',
      projects: { starter: {} },
      tests: { typo: { project: 'starter', result: 3 } },
    }).success,
    false,
  )
})
