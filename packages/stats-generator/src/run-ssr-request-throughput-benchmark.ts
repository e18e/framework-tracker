import { readProjectResult } from '@framework-tracker/results/storage'
import { measurements } from './measurements.ts'
import { parseRunFrequency } from './benchmark-utils.ts'
import { RequestThroughputResultSchema } from './schemas.ts'
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
  const { packageName, args } = parseArgs(
    'Usage: run-ssr-request-throughput-benchmark <package-name> [runs]\nExample: run-ssr-request-throughput-benchmark app-astro 5',
  )

  const runs = parseRunFrequency(
    args[0],
    measurements.ssrRequestThroughput.runs,
  )

  console.info(
    `Running SSR request throughput benchmark for ${packageName} (${runs} runs)...\n`,
  )

  if (!supportsSSRRequestThroughputBenchmark(packageName)) {
    console.info(
      `SSR request throughput benchmark is not configured for ${packageName}; skipping.`,
    )
    return
  }

  const { framework } = await getFrameworkByPackage(packageName)

  const result = await runSSRRequestThroughputBenchmark(packageName, runs)
  const timestamp = new Date().toISOString()
  const frameworkVersion = await getFrameworkVersion(
    packageName,
    framework.frameworkPackage,
  )

  const existingStats = normalizeCIStats(
    readJsonFile<CIStats>(join(packagesDir, packageName, 'ci-stats.json')) ??
      (readProjectResult(packageName) as CIStats | null) ??
      {},
  )

  const ciStats: CIStats = {
    ...existingStats,
    timingMeasuredAt: timestamp,
    runner: process.env.RUNNER_LABEL || 'local',
    frameworkVersion: frameworkVersion ?? existingStats.frameworkVersion,
    ssrRequestThroughputTests: result.benchmark,
  }

  const outputPath = join(packagesDir, result.package, 'ci-stats.json')
  RequestThroughputResultSchema.parse(ciStats)
  writeJsonFile(outputPath, ciStats)

  console.info(
    `\n✓ Saved ${result.displayName} v${frameworkVersion ?? 'unknown'} (${result.package})`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
