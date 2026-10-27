import { readProjectResult } from '@framework-tracker/results/storage'
import { parseRunFrequency } from './benchmark-utils.ts'
import { measurements } from './measurements.ts'
import { ServerSideRenderedStatsSchema } from '@framework-tracker/results'
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
  const runs = parseRunFrequency(args[0], measurements.serverSideRendered.runs)

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
      (readProjectResult(packageName) as CIStats | null) ??
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
  ServerSideRenderedStatsSchema.parse(ciStats)
  writeJsonFile(outputPath, ciStats)

  console.info(
    `\n✓ Saved ${result.displayName} v${frameworkVersion ?? 'unknown'} (${packageName})`,
  )
  console.info(
    `  First Paint: ${result.serverSideRenderedTests.firstPaintMs.mean}ms`,
  )
  console.info(`  FCP:         ${result.serverSideRenderedTests.fcpMs.mean}ms`)
  const interaction = result.serverSideRenderedTests.interactionTests
  console.info(`  Interaction: ${interaction.interactionLatencyMs.mean}ms`)
  console.info(`    Input delay:  ${interaction.inputDelayMs.mean}ms`)
  console.info(`    Processing:   ${interaction.processingDurationMs.mean}ms`)
  console.info(`    Presentation: ${interaction.presentationDelayMs.mean}ms`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
