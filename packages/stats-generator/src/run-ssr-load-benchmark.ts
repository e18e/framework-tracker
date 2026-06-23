import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  runSSRLoadBenchmark,
  supportsSSRLoadBenchmark,
} from './ssrLoad/index.ts'
import { packagesDir } from './constants.ts'
import {
  getFrameworkByPackage,
  normalizeCIStats,
  readJsonFile,
  writeJsonFile,
} from './utils.ts'
import type { CIStats } from './types.ts'

async function getFrameworkVersion(
  packageName: string,
  frameworkPackage: string,
): Promise<string | undefined> {
  if (frameworkPackage === 'node') {
    return process.version.replace(/^v/, '')
  }

  try {
    const pkgJsonPath = join(
      packagesDir,
      packageName,
      'node_modules',
      frameworkPackage,
      'package.json',
    )
    const pkgJson = JSON.parse(await readFile(pkgJsonPath, 'utf-8')) as {
      version?: string
    }
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
    console.error('Usage: run-ssr-load-benchmark <package-name>')
    console.error('Example: run-ssr-load-benchmark app-astro')
    process.exit(1)
  }

  if (!supportsSSRLoadBenchmark(packageName)) {
    console.info(
      `SSR load benchmark is not configured for ${packageName}; skipping.`,
    )
    return
  }

  console.info(`Running SSR load benchmark for ${packageName}...\n`)

  const { framework } = await getFrameworkByPackage(packageName)
  const frameworkVersion = await getFrameworkVersion(
    packageName,
    framework.frameworkPackage,
  )
  const result = await runSSRLoadBenchmark(packageName)
  const timestamp = new Date().toISOString()
  const runner = process.env.RUNNER_LABEL || 'local'

  const existingStats = readJsonFile<CIStats>(
    join(packagesDir, packageName, 'ci-stats.json'),
  )

  const ciStats: CIStats = {
    ...(existingStats ? normalizeCIStats(existingStats) : {}),
    timingMeasuredAt: timestamp,
    runner,
    frameworkVersion: frameworkVersion ?? existingStats?.frameworkVersion,
    ssrLoadTests: result.ssrLoadTests,
  }

  const outputPath = join(packagesDir, packageName, 'ci-stats.json')
  writeJsonFile(outputPath, ciStats)

  console.info(
    `\n✓ Saved SSR load stats for ${packageName}: ${result.ssrLoadTests.peakRequestsPerSec} req/s at ${result.ssrLoadTests.peakWorkers} workers`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
