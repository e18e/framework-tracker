import { validateSSRLoadForPersistence } from './persistence.ts'
import type { CIStats } from '../types.ts'
import {
  SSRLoadStatsSchema,
  SSRRouterLinkLoadStatsSchema,
} from '@framework-performance/results'
import type { SSRLoadKind } from './config.ts'
import { isDeepStrictEqual } from 'node:util'
import { measurementsConfig } from '../measurements.ts'

/** Jobs upload a full ci-stats file, including possibly stale sibling results.
 * Import only the series owned by this artifact, never its sibling series.
 */
export function mergeSSRLoadArtifact(
  stats: CIStats,
  artifact: CIStats,
  kind: SSRLoadKind,
): CIStats {
  const schema =
    kind === 'ssrLoad' ? SSRLoadStatsSchema : SSRRouterLinkLoadStatsSchema
  const validated = schema.parse(artifact)
  validateSSRLoadForPersistence({ [kind]: artifact[kind] })
  const result =
    'ssrLoad' in validated ? validated.ssrLoad : validated.ssrRouterLinkLoad
  // The schema already requires every sweep to use the same stages in order.
  const measured = result.iterations[0]!.map((stage) => stage.connections)
  const expected = measurementsConfig[kind].stageConnections
  if (!isDeepStrictEqual(measured, expected)) {
    throw new Error(
      `Invalid ${kind} stages: expected connections [${expected.join(', ')}], received [${measured.join(', ')}]`,
    )
  }
  return {
    ...stats,
    frameworkVersion: validated.frameworkVersion ?? stats.frameworkVersion,
    [kind]: artifact[kind],
  }
}
