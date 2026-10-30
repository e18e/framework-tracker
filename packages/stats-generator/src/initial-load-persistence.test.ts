import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { InitialLoadResourceTypeSchema } from '@framework-tracker/results'
import {
  projectResult,
  readProjectResult,
} from '@framework-tracker/results/storage'
import { frameworks } from './frameworks.ts'
import { processCIStats } from './save-ci-stats.ts'

test('CI requires, validates, and preserves initial load artifacts', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'initial-load-ci-'))
  const framework = frameworks.find((framework) => framework.name === 'astro')!
  const configured = {
    ...framework,
    starter: undefined,
    app: { ...framework.app!, measurements: ['initialLoad' as const] },
  }
  const options = {
    validateOnly: true,
    requireAllArtifacts: true,
    frameworks: [configured],
  }
  const path = join(directory, 'initial-load-stats-astro', 'ci-stats.json')
  const resources = Object.fromEntries(
    InitialLoadResourceTypeSchema.options.map((key) => [
      key,
      { requestCount: 0, transferSize: 0 },
    ]),
  )
  const artifact = {
    frameworkVersion: readProjectResult('app-astro')?.frameworkVersion,
    browserVersion: 'Chrome/156',
    initialLoadTests: {
      name: 'initialLoad',
      source: 'lighthouse-resource-summary',
      path: '/initial-load',
      resources,
    },
  }
  try {
    await assert.rejects(
      processCIStats(directory, options),
      /Missing or invalid measurement artifact/,
    )
    mkdirSync(join(directory, 'initial-load-stats-astro'))
    writeFileSync(path, JSON.stringify(artifact))
    const results = await processCIStats(directory, options)
    assert.deepEqual(
      projectResult(results.get('astro')!, 'app')?.initialLoadTests,
      artifact.initialLoadTests,
    )
    assert.equal(
      projectResult(results.get('astro')!, 'app')?.frameworkVersion,
      artifact.frameworkVersion,
    )
    writeFileSync(path, JSON.stringify({ ...artifact, initialLoadTests: {} }))
    await assert.rejects(processCIStats(directory, options))
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
