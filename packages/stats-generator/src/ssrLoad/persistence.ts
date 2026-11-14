import { isDeepStrictEqual } from 'node:util'
import { metricSummaries } from '@framework-performance/results/comparison'
import {
  SSRLoadStatsSchema,
  SSRRouterLinkLoadStatsSchema,
} from '@framework-performance/results'
import type { CIStats } from '../types.ts'
import { summarizeLoadSweeps } from './run-load-test.ts'

export function validateSSRLoadForPersistence(stats: CIStats): void {
  for (const key of ['ssrLoad', 'ssrRouterLinkLoad'] as const) {
    if (stats[key] === undefined) continue
    const schema =
      key === 'ssrLoad' ? SSRLoadStatsSchema : SSRRouterLinkLoadStatsSchema
    const parsed = schema.parse(stats)
    const value =
      'ssrLoad' in parsed ? parsed.ssrLoad : parsed.ssrRouterLinkLoad
    const expected = summarizeLoadSweeps(value.iterations, value.name)
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
