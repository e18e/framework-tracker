import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  readProjectResult,
  resultPath,
  saveProjectResult,
} from '@framework-tracker/results/storage'
import { frameworks } from './frameworks.ts'
import { promoteResults } from './promote-results.ts'

const selectedFrameworks = frameworks.filter((item) => item.name === 'astro')

for (const upgradedProject of ['starter', 'app'] as const) {
  test(`promotion preserves sibling history when ${upgradedProject} advances to another version`, () => {
    const directory = mkdtempSync(join(tmpdir(), 'promote-results-'))
    const sourceRoot = join(directory, 'incoming')
    const destinationRoot = join(directory, 'canonical')
    const oldStarter = {
      frameworkVersion: '1.0.0',
      runner: 'old-starter',
      prodDependencies: 3,
      devDependencies: 2,
    }
    const oldApp = {
      frameworkVersion: '1.0.0',
      runner: 'old-app',
      testTimeMs: 20,
    }
    const newStarter = {
      frameworkVersion: upgradedProject === 'starter' ? '2.0.0' : '1.0.0',
      runner: 'new-starter',
      prodDependencies: 4,
    }
    const newApp = {
      frameworkVersion: upgradedProject === 'app' ? '2.0.0' : '1.0.0',
      runner: 'new-app',
      testTimeMs: 30,
    }

    try {
      saveProjectResult('starter-astro', oldStarter, destinationRoot)
      saveProjectResult('app-astro', oldApp, destinationRoot)
      saveProjectResult(
        'app-astro',
        { frameworkVersion: '0.5.0', testTimeMs: 10 },
        destinationRoot,
      )
      saveProjectResult('starter-next-js', oldStarter, destinationRoot)
      const unrelatedHistoryPath = resultPath('astro', '0.5.0', destinationRoot)
      const unrelatedHistory = readFileSync(unrelatedHistoryPath, 'utf8')
      const otherFrameworkPath = resultPath('next', undefined, destinationRoot)
      const otherFramework = readFileSync(otherFrameworkPath, 'utf8')

      saveProjectResult('starter-astro', newStarter, sourceRoot)
      saveProjectResult('app-astro', newApp, sourceRoot)
      const sourceLatestPath = resultPath('astro', undefined, sourceRoot)
      const sourceLatest = readFileSync(sourceLatestPath, 'utf8')

      promoteResults(selectedFrameworks, sourceRoot, destinationRoot)

      assert.deepEqual(
        readProjectResult('starter-astro', '1.0.0', destinationRoot),
        upgradedProject === 'starter' ? oldStarter : newStarter,
      )
      assert.deepEqual(
        readProjectResult('app-astro', '1.0.0', destinationRoot),
        upgradedProject === 'app' ? oldApp : newApp,
      )
      assert.deepEqual(
        readProjectResult(`${upgradedProject}-astro`, '2.0.0', destinationRoot),
        upgradedProject === 'starter' ? newStarter : newApp,
      )
      assert.equal(
        readFileSync(resultPath('astro', undefined, destinationRoot), 'utf8'),
        sourceLatest,
      )
      assert.equal(readFileSync(sourceLatestPath, 'utf8'), sourceLatest)
      assert.equal(readFileSync(unrelatedHistoryPath, 'utf8'), unrelatedHistory)
      assert.equal(readFileSync(otherFrameworkPath, 'utf8'), otherFramework)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
}

test('promotion creates results when there is no existing destination', () => {
  const directory = mkdtempSync(join(tmpdir(), 'promote-results-'))
  const sourceRoot = join(directory, 'incoming')
  const destinationRoot = join(directory, 'canonical')
  const starter = { frameworkVersion: '1.0.0', prodDependencies: 3 }
  const app = { frameworkVersion: '1.0.0', testTimeMs: 20 }
  try {
    saveProjectResult('starter-astro', starter, sourceRoot)
    saveProjectResult('app-astro', app, sourceRoot)

    promoteResults(selectedFrameworks, sourceRoot, destinationRoot)

    for (const version of [undefined, '1.0.0']) {
      assert.deepEqual(
        readProjectResult('starter-astro', version, destinationRoot),
        starter,
      )
      assert.deepEqual(
        readProjectResult('app-astro', version, destinationRoot),
        app,
      )
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('promotion rejects invalid incoming results before changing the destination', () => {
  const directory = mkdtempSync(join(tmpdir(), 'promote-results-'))
  const sourceRoot = join(directory, 'incoming')
  const destinationRoot = join(directory, 'canonical')
  try {
    for (const root of [sourceRoot, destinationRoot]) {
      saveProjectResult(
        'starter-astro',
        { frameworkVersion: '1.0.0', prodDependencies: 3 },
        root,
      )
      saveProjectResult(
        'app-astro',
        { frameworkVersion: '1.0.0', testTimeMs: 20 },
        root,
      )
    }
    const destinationLatestPath = resultPath(
      'astro',
      undefined,
      destinationRoot,
    )
    const originalLatest = readFileSync(destinationLatestPath, 'utf8')
    writeFileSync(resultPath('astro', undefined, sourceRoot), '{}')

    assert.throws(() =>
      promoteResults(selectedFrameworks, sourceRoot, destinationRoot),
    )
    assert.equal(readFileSync(destinationLatestPath, 'utf8'), originalLatest)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
