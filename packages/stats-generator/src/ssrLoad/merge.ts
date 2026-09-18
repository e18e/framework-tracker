import type { CIStats } from '../types.ts'
import { SSRLoadStatsSchema, SSRRouterLinkLoadStatsSchema } from '../schemas.ts'
import { getSSRLoadStatsKey, type SSRLoadKind } from './config.ts'

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
  const key = getSSRLoadStatsKey(kind)
  return {
    ...stats,
    frameworkVersion: validated.frameworkVersion ?? stats.frameworkVersion,
    [key]: artifact[key],
  }
}
