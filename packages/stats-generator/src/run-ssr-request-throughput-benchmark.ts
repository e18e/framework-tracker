import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { runSSRRequestThroughputBenchmark } from './ssrRequestThroughput/index.ts'
import { packagesDir } from './constants.ts'
import {
  getFrameworkByPackage,
  normalizeCIStats,
  readJsonFile,
} from './utils.ts'
import type { CIStats } from './types.ts'

async function getFrameworkVersion(
  packageName: string,
  frameworkPackage: string,
): Promise<string | undefined> {
  try {
    const pkgJsonPath = join(
      packagesDir,
      packageName,
      'node_modules',
      frameworkPackage,
      'package.json',
    )
    const pkgJson = JSON.parse(await readFile(pkgJsonPath, 'utf-8'))
    return pkgJson.version
  } catch {
    console.warn(
      `Could not read version for ${frameworkPackage} in ${packageName}`,
    )
    return undefined
  }
}

async function main() {
  const packageName = process.argv[2]

  if (!packageName) {
    console.error('Usage: run-ssr-request-throughput-benchmark <package-name>')
    console.error('Example: run-ssr-request-throughput-benchmark app-astro')
    process.exit(1)
  }

  console.info(
    `Running SSR request throughput benchmark for ${packageName}...\n`,
  )

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
  await writeFile(outputPath, JSON.stringify(ciStats, null, 2), 'utf-8')

  console.info(
    `\n✓ Saved ${result.displayName} v${frameworkVersion ?? 'unknown'} (${result.package})`,
  )
}

main().catch(console.error)
