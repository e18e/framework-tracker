import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import {
  getSSRLoadPath,
  getSSRLoadStatsKey,
  routerLinkPackages,
} from './ssrLoad/config.ts'
import { mergeSSRLoadArtifact } from './ssrLoad/merge.ts'
import { verifySSRLoadTable } from './ssrLoad/verify-table.ts'
import { renderBaselineHtml } from './baseline-html.ts'
import { summarizeLoadStages } from './ssrLoad/run-load-test.ts'
import type { SSRLoadStageStats } from './ssrLoad/types.ts'
import { testData } from '../../testdata/src/ssr.ts'

const historical = JSON.parse(
  readFileSync(
    new URL('../../app-next-js/ci-stats.json', import.meta.url),
    'utf8',
  ),
).ssrRouterLinkLoadTests

function loadStage(
  overrides: Partial<SSRLoadStageStats> = {},
): SSRLoadStageStats {
  return {
    workers: 1,
    durationMs: 5000,
    requests: 500,
    errors: 0,
    requestsPerSec: 100,
    avgLatencyMs: 10,
    medianLatencyMs: 9,
    p50LatencyMs: 9,
    p75LatencyMs: 12,
    p90LatencyMs: 15,
    p99LatencyMs: 20,
    maxLatencyMs: 30,
    bytesPerSec: 1000,
    ...overrides,
  }
}

test('load peak excludes failing stages while preserving their diagnostics', () => {
  const stages = [
    loadStage({ workers: 1, requestsPerSec: 500, errors: 1 }),
    loadStage({ workers: 5, requestsPerSec: 200, p99LatencyMs: 25 }),
    loadStage({ workers: 10, requestsPerSec: 100 }),
    loadStage({ workers: 25, requestsPerSec: 1000, errors: 10 }),
  ]
  const result = summarizeLoadStages(stages)
  assert.equal(result.peakWorkers, 5)
  assert.equal(result.peakRequestsPerSec, 200)
  assert.equal(result.peakP99LatencyMs, 25)
  assert.equal(result.totalRequests, 2000)
  assert.equal(result.totalErrors, 11)
  assert.deepEqual(result.stages, stages)
})

test('load peak picks the fastest clean stage and keeps the first on ties', () => {
  const result = summarizeLoadStages([
    loadStage(),
    loadStage({ workers: 5, requestsPerSec: 200 }),
    loadStage({ workers: 10, requestsPerSec: 200 }),
  ])
  assert.equal(result.peakWorkers, 5)
  assert.equal(result.peakRequestsPerSec, 200)
})

test('load peak fails explicitly when no stage qualifies', () => {
  for (const stages of [
    [],
    [loadStage({ errors: 1 }), loadStage({ workers: 5, errors: 2 })],
  ]) {
    assert.throws(
      () => summarizeLoadStages(stages),
      /No valid SSR load peak: no stage completed with zero errors/,
    )
  }
})

test('routes and result keys separate the two load tests', () => {
  for (const pkg of routerLinkPackages) {
    assert.equal(
      getSSRLoadPath(pkg, 'ssrLoad'),
      '/server-side-rendered-plain-links',
    )
    assert.equal(
      getSSRLoadPath(pkg, 'ssrRouterLinkLoad'),
      '/server-side-rendered',
    )
  }
  for (const pkg of [
    'app-astro',
    'app-solid-start',
    'app-sveltekit',
    'app-baseline-html',
  ]) {
    assert.equal(getSSRLoadPath(pkg, 'ssrLoad'), '/server-side-rendered')
    assert.throws(() => getSSRLoadPath(pkg, 'ssrRouterLinkLoad'))
  }
  assert.equal(getSSRLoadStatsKey('ssrLoad'), 'ssrLoadTests')
  assert.equal(
    getSSRLoadStatsKey('ssrRouterLinkLoad'),
    'ssrRouterLinkLoadTests',
  )
})

test('separate job artifacts cannot overwrite sibling measurements in either merge order', () => {
  const anchor = { ...historical, totalRequests: 123 }
  const router = { ...historical, totalRequests: 456 }
  const anchorArtifact = {
    ssrLoadTests: anchor,
    ssrRouterLinkLoadTests: historical,
  }
  const routerArtifact = {
    ssrLoadTests: historical,
    ssrRouterLinkLoadTests: router,
  }
  for (const reverse of [false, true]) {
    const result = reverse
      ? mergeSSRLoadArtifact(
          mergeSSRLoadArtifact({}, routerArtifact, 'ssrRouterLinkLoad'),
          anchorArtifact,
          'ssrLoad',
        )
      : mergeSSRLoadArtifact(
          mergeSSRLoadArtifact({}, anchorArtifact, 'ssrLoad'),
          routerArtifact,
          'ssrRouterLinkLoad',
        )
    assert.deepEqual(result.ssrLoadTests, anchor)
    assert.deepEqual(result.ssrRouterLinkLoadTests, router)
  }

  assert.throws(() => mergeSSRLoadArtifact({}, {}, 'ssrLoad'))
})

test('HTTP table verification rejects missing rows, wrong columns, text, and destinations', async () => {
  const html = renderBaselineHtml(await testData())
  verifySSRLoadTable(html)
  for (const invalid of [
    html.replace(/<tr>.*?<\/tr>/, ''),
    html.replace(/<td>.*?<\/td>/, ''),
    html.replace('View →', 'View'),
    html.replace('/server-side-rendered/', '/wrong/'),
  ]) {
    assert.throws(() => verifySSRLoadTable(invalid))
  }
})

test('paired route sources preserve the loader and table except for link implementation', () => {
  const paths = [
    [
      'app-next-js/app/server-side-rendered/page.tsx',
      'app-next-js/app/server-side-rendered-plain-links/page.tsx',
    ],
    [
      'app-nuxt/app/pages/server-side-rendered/index.vue',
      'app-nuxt/app/pages/server-side-rendered-plain-links/index.vue',
    ],
    [
      'app-react-router/app/routes/server-side-rendered.tsx',
      'app-react-router/app/routes/server-side-rendered-plain-links.tsx',
    ],
    [
      'app-tanstack-start-react/src/routes/server-side-rendered.tsx',
      'app-tanstack-start-react/src/routes/server-side-rendered-plain-links.tsx',
    ],
  ]
  for (const [routerPath, anchorPath] of paths) {
    const read = (path: string) =>
      readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
    const original = read(routerPath)
    const anchor = read(anchorPath)
    assert.match(original, /<(?:Link|NuxtLink)\b/)
    assert.doesNotMatch(anchor, /<(?:Link|NuxtLink)\b/)
    const normalized = original
      .replace(/import Link from 'next\/link'\n/, '')
      .replace(/import \{ Link \} from 'react-router'\n/, '')
      .replace('createFileRoute, Link', 'createFileRoute')
      .replace(
        "createFileRoute('/server-side-rendered')",
        "createFileRoute('/server-side-rendered-plain-links')",
      )
      .replace(
        './+types/server-side-rendered',
        './+types/server-side-rendered-plain-links',
      )
      .replace(
        '<Link to="/server-side-rendered/$id" params={{ id: entry.id }}>',
        '<a href={`/server-side-rendered/${entry.id}`}>',
      )
      .replace(/<Link (?:href|to)=/g, '<a href=')
      .replace(/<NuxtLink :to=/g, '<a :href=')
      .replace(/<\/(?:Link|NuxtLink)>/g, '</a>')
    const compact = (source: string) => source.replace(/\s+/g, '')
    assert.equal(compact(anchor), compact(normalized), routerPath)
  }
})
