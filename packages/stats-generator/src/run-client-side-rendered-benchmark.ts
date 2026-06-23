import { join } from 'node:path'
import { runClientSideRenderedBenchmark } from './clientSideRendered/index.ts'
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
    'Usage: run-client-side-rendered-benchmark <package-name> [runs]\nExample: run-client-side-rendered-benchmark app-astro 5',
  )
  const runs = args[0] ? Number.parseInt(args[0], 10) : 5

  console.info(
    `Running client-side rendered benchmark for ${packageName} (${runs} runs)...\n`,
  )

  const { framework } = await getFrameworkByPackage(packageName)
  const frameworkVersion = await getFrameworkVersion(
    packageName,
    framework.frameworkPackage,
  )

  const result = await runClientSideRenderedBenchmark(packageName, runs)
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
    frameworkVersion: frameworkVersion ?? existingStats?.frameworkVersion,
    clientSideRenderedTests: result.clientSideRenderedTests,
  }

  const outputPath = join(packagesDir, packageName, 'ci-stats.json')
  writeJsonFile(outputPath, ciStats)

  console.info(
    `\n✓ Saved ${result.displayName} v${frameworkVersion ?? 'unknown'} (${packageName})`,
  )
  console.info(
    `  First Paint: ${result.clientSideRenderedTests.firstPaintMs}ms`,
  )
  console.info(`  FCP:         ${result.clientSideRenderedTests.fcpMs}ms`)
  console.info(`  INP:         ${result.clientSideRenderedTests.inpMs}ms`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
