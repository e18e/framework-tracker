import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { getFrameworks } from './get-frameworks.ts'
import { packagesDir } from './constants.ts'
import { getPublishTimes, withReleasedAt } from './release-dates.ts'
import { readJsonFile, writeJsonFile } from './utils.ts'
import type { CIStats } from './types.ts'

async function getStatsFiles(packageName: string) {
  const files = [join(packagesDir, packageName, 'ci-stats.json')]
  try {
    const statsDir = join(packagesDir, packageName, 'stats')
    for (const file of await readdir(statsDir)) {
      if (file.endsWith('.json')) files.push(join(statsDir, file))
    }
  } catch {
    // No versioned stats yet
  }
  return files
}

async function main() {
  const frameworks = await getFrameworks()
  let updated = 0
  let missing = 0

  for (const framework of frameworks) {
    const packages = [
      framework.starter?.package,
      framework.app?.package,
    ].filter((pkg) => pkg != null)
    if (packages.length === 0) continue

    console.info(`${framework.frameworkPackage}`)
    const publishTimes = await getPublishTimes(framework.frameworkPackage)

    for (const packageName of packages) {
      for (const file of await getStatsFiles(packageName)) {
        const stats = readJsonFile<CIStats>(file)
        const version = stats?.frameworkVersion
        if (stats == null || version == null || version === 'unknown') continue

        const releasedAt = publishTimes[version]
        const label = `${packageName}/${file.split('/').at(-1)}`
        if (releasedAt == null) {
          console.warn(`  ❌ ${label}: no publish time for ${version}`)
          missing++
          continue
        }

        writeJsonFile(file, withReleasedAt(stats, releasedAt))
        console.info(`  ✓ ${label}: ${version} released ${releasedAt}`)
        updated++
      }
    }
  }

  console.info(`\nUpdated ${updated} file(s)`)
  if (missing > 0) {
    console.warn(`${missing} file(s) had no publish time`)
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('Backfill failed:', error)
  process.exit(1)
})
