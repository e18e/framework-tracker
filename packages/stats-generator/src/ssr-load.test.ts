import { getLoadPeakStage } from '@framework-tracker/results/selection'
import { normalizeCIStats } from './utils.ts'
import { validateSSRLoadForPersistence } from './ssrLoad/persistence.ts'
import { SSRLoadTestsSchema } from '@framework-tracker/results'
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
import { runLoadTest, summarizeLoadSweeps } from './ssrLoad/run-load-test.ts'
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
    elapsedTimeMs: 5000,
    requests: 500,
    errors: 0,
    requestsPerSec: 100,
    avgLatencyMs: 10,
    p50LatencyMs: 9,
    p75LatencyMs: 12,
    p90LatencyMs: 15,
    p99LatencyMs: 20,
    maxLatencyMs: 30,
    bytesPerSec: 1000,
    ...overrides,
  }
}

function loadSweep(stages: SSRLoadStageStats[]) {
  return stages
}

test('load peak excludes failing stages while preserving their diagnostics', () => {
  const stages = [
    loadStage({ workers: 1, requestsPerSec: 500, errors: 1 }),
    loadStage({ workers: 5, requestsPerSec: 200, p99LatencyMs: 25 }),
    loadStage({ workers: 10, requestsPerSec: 100 }),
    loadStage({ workers: 25, requestsPerSec: 1000, errors: 10 }),
  ]
  const result = getLoadPeakStage(stages)
  assert.equal(result.workers, 5)
  assert.equal(result.requestsPerSec, 200)
  assert.equal(result.p99LatencyMs, 25)
  assert.equal(stages.length, 4)
  assert.equal(stages[3]!.errors, 10)
})

test('load peak picks the fastest clean stage and keeps the first on ties', () => {
  const result = getLoadPeakStage([
    loadStage(),
    loadStage({ workers: 5, requestsPerSec: 200 }),
    loadStage({ workers: 10, requestsPerSec: 200 }),
  ])
  assert.equal(result.workers, 5)
  assert.equal(result.requestsPerSec, 200)
})

test('load peak fails explicitly when no stage qualifies', () => {
  for (const stages of [
    [],
    [loadStage({ errors: 1 }), loadStage({ workers: 5, errors: 2 })],
  ]) {
    assert.throws(
      () => getLoadPeakStage(stages),
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
  const anchor = summarizeLoadSweeps([
    loadSweep([loadStage({ requests: 123 })]),
  ])
  const router = summarizeLoadSweeps(
    [loadSweep([loadStage({ requests: 456 })])],
    'ssrRouterLinkLoad',
  )
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
      'app-pracht/src/routes/server-side-rendered.tsx',
      'app-pracht/src/routes/server-side-rendered-plain-links.tsx',
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
      .replace(
        "import { Link, type RouteComponentProps } from '@pracht/core'",
        "import type { RouteComponentProps } from '@pracht/core'",
      )
      .replace(
        /<Link\s+route="server-side-rendered-detail"\s+params=\{\{ id: entry\.id \}\}\s*>/,
        '<a href={`/server-side-rendered/${entry.id}`}>',
      )
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

test('repeated load sweeps select the median peak sweep without mixing metrics', () => {
  const samples = [300, 100, 200].map((requestsPerSec) =>
    loadSweep([
      loadStage({ requestsPerSec, p99LatencyMs: requestsPerSec / 2 }),
    ]),
  )
  const result = summarizeLoadSweeps(samples)
  assert.equal(result.representativeIterationIndex, 2)
  const peak = getLoadPeakStage(
    result.iterations[result.representativeIterationIndex]!,
  )
  assert.equal(peak.requestsPerSec, 200)
  assert.equal(peak.p99LatencyMs, 100)
  assert.deepEqual(result.iterations, samples)
  assert.equal(result.runs, 3)
  assert.equal(samples[0]![0]!.requestsPerSec, 300)
  assert.throws(() => summarizeLoadSweeps([]))
  assert.throws(() => summarizeLoadSweeps(samples.slice(0, 2)))
  SSRLoadTestsSchema.parse(result)
})

test('load runner warms up before each full sweep and excludes warm-up requests', async () => {
  const calls: number[] = []
  const pauses: number[] = []
  const result = await runLoadTest(
    'http://example.test/server-side-rendered',
    async (_, workers) => {
      calls.push(workers)
      return loadStage({
        workers,
        requests: calls.length % 8 === 1 ? 99999 : 500,
      })
    },
    async (ms) => {
      pauses.push(ms)
    },
  )
  assert.deepEqual(
    calls,
    Array.from({ length: 3 }, () => [1, 1, 5, 10, 25, 50, 100, 200]).flat(),
  )
  assert.deepEqual(pauses, [5000, 5000])
  assert.equal(result.runs, 3)
  assert.equal(result.configuration.warmupDurationMs, 5000)
  assert.equal(result.totalRequests, 10500)
  assert.ok(
    result.iterations!.every(
      (sample) =>
        sample.reduce((total, stage) => total + stage.requests, 0) === 3500,
    ),
  )
  SSRLoadTestsSchema.parse(result)
})

test('warm-up recovers after an overloaded sweep without retaining retry measurements', async () => {
  const events: string[] = []
  let calls = 0
  const result = await runLoadTest(
    'http://example.test/server-side-rendered',
    async (_, workers) => {
      events.push(`stage:${workers}`)
      calls++
      return loadStage({
        workers,
        requests: calls === 9 ? 99999 : 500,
        errors: calls === 9 ? 2 : 0,
      })
    },
    async (ms) => {
      events.push(`pause:${ms}`)
    },
  )
  assert.deepEqual(events.slice(8, 13), [
    'pause:5000',
    'stage:1',
    'pause:5000',
    'stage:1',
    'stage:1',
  ])
  assert.equal(calls, 25)
  assert.equal(result.iterations!.length, 3)
  assert.ok(
    result.iterations!.every(
      (sample) =>
        sample.reduce((total, stage) => total + stage.requests, 0) === 3500 &&
        sample.every((stage) => stage.errors === 0),
    ),
  )
})

test('persistently unhealthy warm-up stops after three attempts with diagnostics', async () => {
  for (const stage of [loadStage({ errors: 2 }), loadStage({ requests: 0 })]) {
    let calls = 0
    const pauses: number[] = []
    await assert.rejects(
      runLoadTest(
        'http://example.test/server-side-rendered',
        async (_, workers) => {
          assert.equal(workers, 1)
          calls++
          return stage
        },
        async (ms) => {
          pauses.push(ms)
        },
      ),
      (error: Error) => {
        assert.match(error.message, /warm-up failed .*sweep 1\/3, attempt 3\/3/)
        assert.ok(
          error.message.includes(
            `${stage.requests} requests, ${stage.errors} errors`,
          ),
        )
        return true
      },
    )
    assert.equal(calls, 3)
    assert.deepEqual(pauses, [5000, 5000])
  }
})

test('load schema requires complete iterations and aligned stages', () => {
  const sweep = loadSweep([loadStage()])
  const result = summarizeLoadSweeps([sweep])
  SSRLoadTestsSchema.parse(result)
  for (const invalid of [
    sweep,
    { ...result, iterations: undefined },
    { ...result, runs: 3 },
    { ...result, representativeIterationIndex: 1 },
    { ...result, iterations: [{ stages: sweep }] },
    { ...result, stages: [result.stage1] },
    { ...result, stage1: undefined },
    { ...result, stage1: { ...result.stage1, connections: 5 } },
    { ...result, totalRequests: { mean: 500 } },
  ]) {
    assert.equal(SSRLoadTestsSchema.safeParse(invalid).success, false)
  }
  assert.throws(
    () =>
      summarizeLoadSweeps([
        sweep,
        sweep,
        loadSweep([loadStage({ workers: 5 })]),
      ]),
    /matching worker/,
  )
})

test('summaries compare each latency statistic at matching workers across sweeps', () => {
  const sweeps = [100, 200, 300].map((rate) =>
    loadSweep([
      loadStage({
        workers: 1,
        requestsPerSec: rate,
        avgLatencyMs: rate / 10,
        p99LatencyMs: rate,
        requests: rate * 5,
      }),
      loadStage({
        workers: 5,
        requestsPerSec: rate * 2,
        avgLatencyMs: rate / 20,
        p99LatencyMs: rate * 3,
        requests: rate * 10,
      }),
    ]),
  )
  const result = summarizeLoadSweeps(sweeps)
  assert.equal(result.stage1.connections, 1)
  assert.equal(result.stage2!.connections, 5)
  assert.equal(result.stage1.requestsPerSec.mean, 200)
  assert.equal(result.stage2!.requestsPerSec.mean, 400)
  assert.equal(result.stage1!.avgLatencyMs.mean, 20)
  assert.equal(result.stage1!.p99LatencyMs.mean, 200)
  assert.equal(result.totalRequests, 9000)
  assert.deepEqual(result.iterations, sweeps)
  validateSSRLoadForPersistence({ ssrLoadTests: result })
  const wrongCount = { ...result, totalRequests: result.totalRequests + 1 }
  assert.throws(() =>
    validateSSRLoadForPersistence({ ssrLoadTests: wrongCount }),
  )
  const invalid = structuredClone(result)
  invalid.stage1!.p99LatencyMs.mean = 1
  assert.throws(() => validateSSRLoadForPersistence({ ssrLoadTests: invalid }))
  assert.throws(() =>
    mergeSSRLoadArtifact({}, { ssrLoadTests: invalid }, 'ssrLoad'),
  )
  assert.throws(() =>
    mergeSSRLoadArtifact({}, { ssrLoadTests: result }, 'ssrRouterLinkLoad'),
  )
})

test('flat legacy compatibility reports unrecoverable sweeps instead of inventing iterations', () => {
  assert.throws(
    () =>
      normalizeCIStats({
        ssrLoadPeakWorkers: 1,
        ssrLoadPeakRequestsPerSec: 100,
        ssrLoadPeakAvgLatencyMs: 10,
        ssrLoadPeakP50LatencyMs: 9,
        ssrLoadPeakP75LatencyMs: 12,
        ssrLoadPeakP90LatencyMs: 15,
        ssrLoadPeakP99LatencyMs: 20,
        ssrLoadTotalRequests: 500,
        ssrLoadTotalErrors: 0,
        ssrLoadStages: [loadStage()],
      } as Parameters<typeof normalizeCIStats>[0]),
    /only a representative sweep/,
  )
})
