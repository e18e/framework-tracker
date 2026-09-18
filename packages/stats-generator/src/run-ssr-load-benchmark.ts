import { getSSRLoadKind, getSSRLoadStatsKey } from './ssrLoad/config.ts'
import { join } from 'node:path'
import {
  runSSRLoadBenchmark,
  supportsSSRLoadBenchmark,
} from './ssrLoad/index.ts'
import { packagesDir } from './constants.ts'
import {
  getFrameworkByPackage,
  getFrameworkVersion,
  normalizeCIStats,
  parseArgs,
  readJsonFile,
  writeJsonFile,
} from './utils.ts'
import type { CIStats } from './types.ts'

async function main() {
  const { packageName } = parseArgs(
    'Usage: run-ssr-load-benchmark <package-name>\nExample: run-ssr-load-benchmark app-astro',
  )

  if (!supportsSSRLoadBenchmark(packageName)) {
    console.info(
      `SSR load benchmark is not configured for ${packageName}; skipping.`,
    )
    return
  }

  const label =
    getSSRLoadKind() === 'ssrLoad'
      ? 'SSR Load Test'
      : 'SSR Router Link Load Test'
  console.info(`Running ${label} for ${packageName}...\n`)

  const { framework } = await getFrameworkByPackage(packageName)
  const frameworkVersion = await getFrameworkVersion(
    packageName,
    framework.frameworkPackage,
  )
  const result = await runSSRLoadBenchmark(packageName)
  const timestamp = new Date().toISOString()
  const runner = process.env.RUNNER_LABEL || 'local'

  const existingStats = normalizeCIStats(
    readJsonFile<CIStats>(join(packagesDir, packageName, 'ci-stats.json')) ??
      {},
  )

  const ciStats: CIStats = {
    ...existingStats,
    timingMeasuredAt: timestamp,
    runner,
    frameworkVersion: frameworkVersion ?? existingStats.frameworkVersion,
    [getSSRLoadStatsKey(getSSRLoadKind())]: result.tests,
  }

  const outputPath = join(packagesDir, packageName, 'ci-stats.json')
  writeJsonFile(outputPath, ciStats)

  console.info(
    `\n✓ Saved ${label} stats for ${packageName}: ${result.tests.peakRequestsPerSec} req/s at ${result.tests.peakWorkers} workers`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
