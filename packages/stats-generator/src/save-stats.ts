import { access, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { packagesDir } from './constants.ts'
import type { FrameworkStats } from './types.ts'

export async function saveStats(packageName: string, stats: FrameworkStats) {
  const outputDir = join(packagesDir, 'docs', 'src', 'content', 'stats')

  try {
    await access(outputDir)
  } catch (_error) {
    throw new Error(
      `Stats content for Astro Docs site does not exist: ${outputDir}`,
    )
  }

  const fileName = `${packageName}.json`
  const filePath = join(outputDir, fileName)

  let mergedStats = stats
  try {
    const existingContent = await readFile(filePath, 'utf-8')
    const existingStats = JSON.parse(existingContent) as FrameworkStats
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

  await writeFile(filePath, JSON.stringify(mergedStats, null, 2), 'utf-8')
}
