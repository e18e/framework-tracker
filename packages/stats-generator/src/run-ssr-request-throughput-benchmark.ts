import { join } from 'node:path'
import {
  runSSRRequestThroughputBenchmark,
  supportsSSRRequestThroughputBenchmark,
} from './ssrRequestThroughput/index.ts'
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
    'Usage: run-ssr-request-throughput-benchmark <package-name>\nExample: run-ssr-request-throughput-benchmark app-astro',
  )

  console.info(
    `Running SSR request throughput benchmark for ${packageName}...\n`,
  )

  if (!supportsSSRRequestThroughputBenchmark(packageName)) {
    console.info(
      `SSR request throughput benchmark is not configured for ${packageName}; skipping.`,
    )
    return
  }

  const { framework } = await getFrameworkByPackage(packageName)

  const result = await runSSRRequestThroughputBenchmark(packageName)
  const timestamp = new Date().toISOString()
  const frameworkVersion = await getFrameworkVersion(
    packageName,
    framework.frameworkPackage,
  )

  const existingStats = normalizeCIStats(
    readJsonFile<CIStats>(join(packagesDir, packageName, 'ci-stats.json')) ??
      {},
  )

  const ciStats: CIStats = {
    ...existingStats,
    timingMeasuredAt: timestamp,
    runner: process.env.RUNNER_LABEL || 'local',
    frameworkVersion: frameworkVersion ?? existingStats.frameworkVersion,
    ssrRequestThroughputTests: {
      opsPerSec: result.opsPerSec,
      avgLatencyMs: result.avgLatencyMs,
      medianLatencyMs: result.medianLatencyMs,
      samples: result.samples,
      bodySizeKb: result.bodySizeKb,
      duplicationFactor: result.duplicationFactor,
    },
  }

  const outputPath = join(packagesDir, result.package, 'ci-stats.json')
  writeJsonFile(outputPath, ciStats)

  console.info(
    `\n✓ Saved ${result.displayName} v${frameworkVersion ?? 'unknown'} (${result.package})`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
