import { isDeepStrictEqual } from 'node:util'
import { metricSummaries } from '@framework-performance/results/comparison'
import {
  SSRLoadStatsSchema,
  SSRRouterLinkLoadStatsSchema,
} from '@framework-performance/results'
import type { CIStats } from '../types.ts'
import { summarizeLoadSweeps } from './run-load-test.ts'

export function validateSSRLoadForPersistence(stats: CIStats): void {
  for (const key of ['ssrLoadTests', 'ssrRouterLinkLoadTests'] as const) {
    if (stats[key] === undefined) continue
    const schema =
      key === 'ssrLoadTests' ? SSRLoadStatsSchema : SSRRouterLinkLoadStatsSchema
    const parsed = schema.parse(stats)
    const value =
      'ssrLoadTests' in parsed
        ? parsed.ssrLoadTests
        : parsed.ssrRouterLinkLoadTests
    const expected = summarizeLoadSweeps(
      value.iterations,
      value.name,
      value.path,
    )
    const summaries = new Map(
      Array.from(
        metricSummaries(value),
        ([path, { variance: _variance, ...measurement }]) => [
          path,
          measurement,
        ],
      ),
    )
    if (
      value.totalRequests.value !== expected.totalRequests.value ||
      value.totalErrors.value !== expected.totalErrors.value ||
      !isDeepStrictEqual(summaries, metricSummaries(expected))
    ) {
      throw new Error(
        `Invalid ${key} summaries: expected statistics from retained sweeps`,
      )
    }
  }
}
