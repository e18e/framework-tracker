import { access, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { packagesDir } from './constants.ts'
import type { FrameworkStats } from './types.ts'
import { normalizeCIStats } from './utils.ts'

export type StatsCollection = 'devtime' | 'runtime'

export async function saveStats(
  packageName: string,
  stats: FrameworkStats,
  collection: StatsCollection = 'devtime',
) {
  const outputDir = join(packagesDir, 'docs', 'src', 'content', collection)

  try {
    await access(outputDir)
  } catch (_error) {
    throw new Error(
      `Content directory for Astro Docs site does not exist: ${outputDir}`,
    )
  }

  const fileName = `${packageName}.json`
  const filePath = join(outputDir, fileName)

  let mergedStats = normalizeCIStats(stats)
  try {
    const existingContent = await readFile(filePath, 'utf-8')
    const existingStats = normalizeCIStats(
      JSON.parse(existingContent) as FrameworkStats,
    )
    mergedStats = { ...existingStats, ...stats }
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      // File doesn't exist yet, will create it with the new stats
    } else {
      throw new Error(
        `Failed to read/parse stats for ${packageName}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  const { packageJson: _packageJson, ...docsStats } = mergedStats

  await writeFile(filePath, JSON.stringify(docsStats, null, 2), 'utf-8')
}
