import { join } from 'node:path'
import { runServerSideRenderedBenchmark } from './serverSideRendered/index.ts'
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
  const { packageName, args } = parseArgs(
    'Usage: run-server-side-rendered-benchmark <package-name> [runs]\nExample: run-server-side-rendered-benchmark app-astro 5',
  )
  const runs = args[0] ? Number.parseInt(args[0], 10) : 5

  console.info(
    `Running server side rendered benchmark for ${packageName} (${runs} runs)...\n`,
  )

  const { framework } = await getFrameworkByPackage(packageName)
  const frameworkVersion = await getFrameworkVersion(
    packageName,
    framework.frameworkPackage,
  )

  const result = await runServerSideRenderedBenchmark(packageName, runs)
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
    browserVersion: result.browserVersion,
    frameworkVersion: frameworkVersion ?? existingStats?.frameworkVersion,
    serverSideRenderedTests: result.serverSideRenderedTests,
  }

  const outputPath = join(packagesDir, packageName, 'ci-stats.json')
  writeJsonFile(outputPath, ciStats)

  console.info(
    `\n✓ Saved ${result.displayName} v${frameworkVersion ?? 'unknown'} (${packageName})`,
  )
  console.info(
    `  First Paint: ${result.serverSideRenderedTests.firstPaintMs}ms`,
  )
  console.info(`  FCP:         ${result.serverSideRenderedTests.fcpMs}ms`)
  console.info(`  INP:         ${result.serverSideRenderedTests.inpMs}ms`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
