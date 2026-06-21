import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { packagesDir } from './constants.ts'
import type { CIStats } from './types.ts'
import { normalizeCIStats } from './utils.ts'

export async function getCIStats(pkgDir: string): Promise<CIStats | null> {
  const ciStatsPath = join(packagesDir, pkgDir, 'ci-stats.json')

  try {
    const content = await readFile(ciStatsPath, 'utf-8')
    return normalizeCIStats(JSON.parse(content) as CIStats)
  } catch (error) {
    console.warn(`Warning: Failed to read CI stats for ${pkgDir}:`, error)
    return null
  }
}
