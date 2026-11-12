import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { InitialLoadResourceTypeSchema } from '@framework-performance/results'
import {
  CombinedResultSchema,
  mergeProjectResult,
  projectResult,
  resultPath,
  saveProjectResult,
} from '@framework-performance/results/storage'

test('saving projects keeps one configuration map in both result files', () => {
  const root = mkdtempSync(join(tmpdir(), 'framework-result-'))
  try {
    const frameworkVersion = '1.0.0'
    const configuration = {
      initialLoad: { path: '/initial-load' },
      nodeEngines: null,
    }
    saveProjectResult(
      'app-astro',
      {
        frameworkVersion,
        initialLoad: {
          name: 'initialLoad',
          resources: Object.fromEntries(
            InitialLoadResourceTypeSchema.options.map((type) => [
              type,
              {
                requestCount: { value: 0, unit: 'requests' },
                transferSize: { value: 0, unit: 'bytes' },
              },
            ]),
          ),
        },
      },
      configuration,
      root,
    )
    saveProjectResult(
      'starter-astro',
      {
        frameworkVersion,
        nodeEngines: {
          name: 'nodeEngines',
          minimumNodeVersion: null,
          imposedBy: [],
        },
      },
      configuration,
      root,
    )
    for (const version of [undefined, frameworkVersion]) {
      const raw = JSON.parse(
        readFileSync(resultPath('astro', version, root), 'utf8'),
      )
      assert.deepEqual(raw.configuration, configuration)
      const result = CombinedResultSchema.parse(raw)
      assert.equal('configuration' in result, false)
      assert.equal('path' in result.tests.initialLoad!.result, false)
    }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

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
