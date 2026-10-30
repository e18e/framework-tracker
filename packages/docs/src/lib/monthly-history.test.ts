import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  getMonthStarts,
  LATEST_POINT,
  selectVersionAt,
} from './monthly-history.ts'
import {
  prepareProdDependenciesComparison,
  prepareProdDependenciesMonthlyComparison,
} from './chart-measurements.ts'

const now = new Date('2026-10-27T12:00:00Z')

test('month starts cover the year ending with the current month', () => {
  const months = getMonthStarts(now)
  assert.equal(months.length, 12)
  assert.equal(months[0]!.toISOString(), '2025-11-01T00:00:00.000Z')
  assert.equal(months.at(-1)!.toISOString(), '2026-10-01T00:00:00.000Z')
})

test('selects the latest version released on or before the date', () => {
  const versions = [
    { v: '1', releasedAt: '2026-08-31T19:00:00Z' },
    { v: '2', releasedAt: '2026-10-01T00:00:00Z' },
    { v: '3', releasedAt: '2026-10-02T00:00:00Z' },
    { v: 'undated' },
  ]
  const date = new Date('2026-10-01T00:00:00Z')
  assert.equal(selectVersionAt(versions, date)?.v, '2')
  assert.equal(
    selectVersionAt(versions, new Date('2026-08-01T00:00:00Z')),
    undefined,
  )
})

const astroVersions = [
  {
    package: 'starter-astro',
    name: 'Astro',
    isFocused: true,
    frameworkVersion: '7.1.6',
    releasedAt: '2026-07-29T14:21:53Z',
    prodDependencies: 10,
  },
  {
    package: 'starter-astro',
    name: 'Astro',
    isFocused: true,
    frameworkVersion: '7.2.10',
    releasedAt: '2026-08-31T19:39:50Z',
    prodDependencies: 12,
  },
]
const astroLatest = {
  package: 'starter-astro',
  name: 'Astro',
  isFocused: true,
  frameworkVersion: '7.4.0',
  releasedAt: '2026-10-15T14:49:24Z',
  prodDependencies: 14,
}

test('leaves gaps before a framework’s first tracked release', () => {
  const chart = prepareProdDependenciesMonthlyComparison(
    astroVersions,
    [astroLatest],
    now,
  )

  assert.equal(chart.id, 'prodDependencies-monthly')
  const [astro] = chart.series
  assert.deepEqual(astro!.color, { dark: '#BC52EE' })
  assert.deepEqual(
    astro!.points.slice(-5, -1).map((p) => [p.month, p.value, p.version]),
    [
      ['2026-07', null, null],
      ['2026-08', 10, '7.1.6'],
      ['2026-09', 12, '7.2.10'],
      ['2026-10', 12, '7.2.10'],
    ],
  )
})

test('the Latest point uses the same latest result as the bar chart', () => {
  const line = prepareProdDependenciesMonthlyComparison(
    astroVersions,
    [astroLatest],
    now,
  )
  const bar = prepareProdDependenciesComparison([astroLatest])

  assert.equal(line.months.at(-1), LATEST_POINT)
  const nowPoint = line.series[0]!.points.at(-1)!
  assert.deepEqual(
    [nowPoint.month, nowPoint.value, nowPoint.version],
    [LATEST_POINT, bar.data[0]!.value, bar.data[0]!.version],
  )
})

test('a framework with only latest results still gets a Latest point', () => {
  const line = prepareProdDependenciesMonthlyComparison([], [astroLatest], now)
  const points = line.series[0]!.points
  assert.ok(points.slice(0, -1).every((p) => p.value == null))
  assert.equal(points.at(-1)!.value, 14)
})
