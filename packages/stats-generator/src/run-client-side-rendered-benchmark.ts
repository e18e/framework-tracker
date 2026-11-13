import { readProjectResult } from '@framework-performance/results/storage'
import { parseRunFrequency } from './benchmark-utils.ts'
import { measurementsConfig } from './measurements.ts'
import { ClientSideRenderedStatsSchema } from '@framework-performance/results'
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
  const runs = parseRunFrequency(
    args[0],
    measurementsConfig.clientSideRendered.runs,
  )

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
      (readProjectResult(packageName) as CIStats | null) ??
      {},
  )

  const ciStats: CIStats = {
    ...existingStats,
    timingMeasuredAt: timestamp,
    runner,
    browserVersion: result.browserVersion,
    frameworkVersion: frameworkVersion ?? existingStats?.frameworkVersion,
    clientSideRendered: result.clientSideRendered,
  }

  const outputPath = join(packagesDir, packageName, 'ci-stats.json')
  ClientSideRenderedStatsSchema.parse(ciStats)
  writeJsonFile(outputPath, ciStats)

  console.info(
    `\n✓ Saved ${result.displayName} v${frameworkVersion ?? 'unknown'} (${packageName})`,
  )
  console.info(`  First Paint: ${result.clientSideRendered.firstPaint.mean}ms`)
  console.info(
    `  FCP:         ${result.clientSideRendered.firstContentfulPaint.mean}ms`,
  )
  const interaction = result.clientSideRendered.interactionTests
  console.info(`  Interaction: ${interaction.interactionLatency.mean}ms`)
  console.info(`    Input delay:  ${interaction.inputDelay.mean}ms`)
  console.info(`    Processing:   ${interaction.processingDuration.mean}ms`)
  console.info(`    Presentation: ${interaction.presentationDelay.mean}ms`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
