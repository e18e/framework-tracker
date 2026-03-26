import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { runSPABenchmark } from './spa/index.ts'
import { packagesDir } from './constants.ts'
import { getFrameworkByPackage } from './utils.ts'
import type { SPAStats } from './spa/types.ts'

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
    console.error('Usage: run-spa-benchmark <package-name> [runs]')
    console.error('Example: run-spa-benchmark app-astro 5')
    process.exit(1)
  }

  console.info(`Running SPA benchmark for ${packageName} (${runs} runs)...\n`)

  const { framework } = await getFrameworkByPackage(packageName)
  const frameworkVersion = await getFrameworkVersion(
    packageName,
    framework.frameworkPackage,
  )

  const result = await runSPABenchmark(packageName, runs)
  const timestamp = new Date().toISOString()

  const spaStats: SPAStats = {
    timingMeasuredAt: timestamp,
    runner: process.env.RUNNER_LABEL || 'local',
    frameworkVersion,
    spaFirstPaintMs: result.spaFirstPaintMs,
    spaFCPMs: result.spaFCPMs,
    spaINPMs: result.spaINPMs,
    spaRuns: result.spaRuns,
  }

  const outputPath = join(packagesDir, packageName, 'spa-stats.json')
  await writeFile(outputPath, JSON.stringify(spaStats, null, 2), 'utf-8')

  console.info(
    `\n✓ Saved ${result.displayName} v${frameworkVersion ?? 'unknown'} (${packageName})`,
  )
  console.info(`  First Paint: ${result.spaFirstPaintMs}ms`)
  console.info(`  FCP:         ${result.spaFCPMs}ms`)
  console.info(`  INP:         ${result.spaINPMs}ms`)
}

main().catch(console.error)
