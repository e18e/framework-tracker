import { isDeepStrictEqual } from 'node:util'
import {
  SSRLoadStatsSchema,
  SSRRouterLinkLoadStatsSchema,
} from '@framework-tracker/results'
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
    if (
      ![
        'totalRequests',
        'totalErrors',
        'stage1',
        'stage2',
        'stage3',
        'stage4',
        'stage5',
        'stage6',
        'stage7',
      ].every((key) =>
        isDeepStrictEqual(
          value[key as keyof typeof value],
          expected[key as keyof typeof expected],
        ),
      )
    ) {
      throw new Error(
        `Invalid ${key} summaries: expected statistics from retained sweeps`,
      )
    }
  }
}
