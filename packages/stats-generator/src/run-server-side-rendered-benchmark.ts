import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { runServerSideRenderedBenchmark } from './serverSideRendered/index.ts'
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
  const runs = process.argv[3] ? parseInt(process.argv[3], 10) : 5

  if (!packageName) {
    console.error(
      'Usage: run-server-side-rendered-benchmark <package-name> [runs]',
    )
    console.error('Example: run-server-side-rendered-benchmark app-astro 5')
    process.exit(1)
  }

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
    frameworkVersion: frameworkVersion ?? existingStats?.frameworkVersion,
    serverSideRenderedTests: result.serverSideRenderedTests,
  }

  const outputPath = join(packagesDir, packageName, 'ci-stats.json')
  await writeFile(outputPath, JSON.stringify(ciStats, null, 2), 'utf-8')

  console.info(
    `\n✓ Saved ${result.displayName} v${frameworkVersion ?? 'unknown'} (${packageName})`,
  )
  console.info(
    `  First Paint: ${result.serverSideRenderedTests.firstPaintMs}ms`,
  )
  console.info(`  FCP:         ${result.serverSideRenderedTests.fcpMs}ms`)
  console.info(`  INP:         ${result.serverSideRenderedTests.inpMs}ms`)
}

main().catch(console.error)
