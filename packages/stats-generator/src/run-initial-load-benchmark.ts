import { readProjectResult } from '@framework-performance/results/storage'
import { InitialLoadResultSchema } from '@framework-performance/results'
import { join } from 'node:path'
import { runInitialLoadBenchmark } from './initialLoad/index.ts'
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
    'Usage: run-initial-load-benchmark <package-name> \nExample: run-initial-load-benchmark app-astro',
  )
  const { framework } = await getFrameworkByPackage(packageName)
  const frameworkVersion = await getFrameworkVersion(
    packageName,
    framework.frameworkPackage,
  )

  const result = await runInitialLoadBenchmark(packageName)
  const timestamp = new Date().toISOString()
  const runner = process.env.RUNNER_LABEL || 'local'

  const existingStats = normalizeCIStats(
    readJsonFile<CIStats>(join(packagesDir, packageName, 'ci-stats.json')) ??
      (readProjectResult(packageName) as CIStats | null) ??
      {},
  )

  const ciStats: CIStats = {
    ...existingStats,
    timingMeasuredAt: timestamp,
    runner,
    browserVersion: result.browserVersion,
    frameworkVersion: frameworkVersion ?? existingStats?.frameworkVersion,
    initialLoad: result.initialLoad,
  }

  const outputPath = join(packagesDir, packageName, 'ci-stats.json')
  InitialLoadResultSchema.parse(ciStats)
  writeJsonFile(outputPath, ciStats)

  console.info(
    `\n✓ Saved ${packageName} v${frameworkVersion ?? 'unknown'} (${packageName})`,
  )
  console.info(
    `  Requests: ${result.initialLoad.resources.total.requestCount.value}`,
  )
  console.info(
    `  Transfer: ${result.initialLoad.resources.total.transferSize.value} bytes`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
