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

// Source changes trigger the full pipeline independently of publishing.
import { frameworks } from './frameworks.ts'
import {
  artifactFiles,
  isLoadJob,
  measurementJobs,
  shouldMeasure,
} from './measurement-pipeline.ts'
import { validateArtifact, validateArtifacts } from './validate-stats.ts'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('any framework or shared source change triggers measurements', () => {
  for (const files of [
    ['packages/app-astro/src/pages/index.astro'],
    ['packages/starter-astro/package.json'],
    [
      'packages/starter-astro/package.json',
      'packages/app-next-js/pnpm-lock.yaml',
    ],
    ['packages/stats-generator/src/run-measurement.ts'],
    ['packages/results/src/frameworks.ts'],
    ['pnpm-lock.yaml'],
    ['pnpm-workspace.yaml'],
    ['.github/workflows/measure.yml'],
    ['packages/testdata/data.json'],
  ])
    assert.equal(shouldMeasure(files), true)
})

test('docs and generated results never select benchmarks', () => {
  assert.equal(
    shouldMeasure([
      'README.md',
      'CONTRIBUTING.md',
      'packages/docs/src/pages/index.astro',
      'packages/starter-astro/README.md',
      'results/astro/latest.json',
      'packages/starter-astro/ci-stats.json',
      'packages/app-next-js/stats/1.json',
      'packages/starter-next-js/build-stats.json',
    ]),
    false,
  )
  assert.equal(shouldMeasure([]), false)
})

test('measurement jobs cover every configured framework and project', () => {
  const jobs = measurementJobs(frameworks)
  assert.deepEqual(
    new Set(jobs.map((job) => job.framework)),
    new Set(frameworks.map((framework) => framework.name)),
  )
  assert.deepEqual(
    new Set(jobs.map((job) => job.package)),
    new Set(
      frameworks.flatMap((framework) =>
        [framework.starter, framework.app].flatMap((project) =>
          project ? [project.package] : [],
        ),
      ),
    ),
  )
})

test('job manifest keeps load jobs separate and requires companion scan artifacts', () => {
  const jobs = measurementJobs(
    frameworks.filter((item) => item.name === 'next'),
  )
  assert.deepEqual(
    jobs.filter(isLoadJob).map((job) => job.task),
    ['ssr-load', 'ssr-router-link-load'],
  )
  assert.deepEqual(artifactFiles(jobs.find((job) => job.task === 'build')!), [
    'build-stats.json',
    'corejs-stats.json',
    'browser-baseline-stats.json',
  ])
  assert.ok(
    artifactFiles(jobs.find((job) => job.task === 'deps')!).includes(
      'first-party-dependency-stats.json',
    ),
  )
})

test('missing and malformed artifacts fail before results can be assembled', () => {
  const directory = mkdtempSync(join(tmpdir(), 'measurement-artifacts-'))
  try {
    const selected = frameworks.filter((item) => item.name === 'astro')
    assert.throws(
      () => validateArtifacts(selected, directory),
      /Missing or invalid result artifact/,
    )
    const job = measurementJobs(selected).find((job) => job.task === 'install')!
    writeFileSync(join(directory, 'install-stats.json'), '{')
    assert.throws(
      () => validateArtifact(job, directory),
      /Missing or invalid result artifact/,
    )
    writeFileSync(join(directory, 'install-stats.json'), '{}')
    assert.throws(
      () => validateArtifact(job, directory),
      /Invalid result artifact/,
    )
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('dependency artifacts validate e18e output with package lockfile counts', () => {
  const directory = mkdtempSync(join(tmpdir(), 'measurement-dependencies-'))
  try {
    const job = measurementJobs(
      frameworks.filter((item) => item.name === 'astro'),
    ).find((job) => job.task === 'deps')!
    const reports = {
      'e18e-stats.json': {
        stats: {
          dependencyCount: { production: 2, development: 3 },
          installSize: 1234,
        },
      },
      'framework-dependency-stats.json': {
        name: 'frameworkDependencies',
        prodDependencies: 1,
        devDependencies: 0,
        allDependencies: 10,
      },
      'first-party-dependency-stats.json': {
        name: 'firstPartyDependencies',
        prodDependencies: 1,
        devDependencies: 0,
        allDependencies: 10,
      },
      'node-engines-stats.json': {
        name: 'nodeEngines',
        minimumNodeVersion: '24.0.0',
        imposedBy: [],
        packagesScanned: 10,
        packagesDeclaringNodeEngine: 5,
        unsatisfiableRanges: [],
      },
    }
    for (const [file, report] of Object.entries(reports))
      writeFileSync(join(directory, file), JSON.stringify(report))
    assert.doesNotThrow(() => validateArtifact(job, directory))
    writeFileSync(join(directory, 'e18e-stats.json'), '{}')
    assert.throws(
      () => validateArtifact(job, directory),
      /Invalid result artifact/,
    )
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
