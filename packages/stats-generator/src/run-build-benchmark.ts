import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { existsSync, rmSync } from 'node:fs'
import { packagesDir } from './constants.ts'
import {
  getDirectorySize,
  writeJsonFile,
  getFrameworkByPackage,
  parseArgs,
} from './utils.ts'
import type { BuildStats } from './types.ts'

function measureBuildTime(cwd: string): number {
  const start = performance.now()
  execSync('pnpm build', { cwd, encoding: 'utf-8', stdio: 'inherit' })
  const end = performance.now()
  return Math.round(end - start)
}

function rmBuildOutput(buildOutputPath: string): void {
  if (existsSync(buildOutputPath)) {
    console.info('Build output found. Removing build output')
    rmSync(buildOutputPath, { recursive: true, force: true })
  } else {
    console.info('No build output found. Skipping removal of build output')
  }
}

async function main() {
  const { packageName, args } = parseArgs(
    'Usage: run-build-benchmark <package-name>\nExample: run-build-benchmark starter-astro',
  )

  const fallbackFrequency = '5'
  const base = 10
  const runFrequency = parseInt(args[0] || fallbackFrequency, base)

  const framework = await getFrameworkByPackage(packageName)

  if (!framework.buildOutputDir) {
    console.error(`No buildOutputDir defined for ${packageName}`)
    process.exit(1)
  }

  console.info(
    `Running build benchmark for ${framework.displayName} (${packageName})...\n`,
  )

  const packageDir = join(packagesDir, packageName)
  const buildOutputPath = join(packageDir, framework.buildOutputDir)

  const coldBuildTimesMs: number[] = []
  const warmBuildTimesMs: number[] = []

  for (let i = 1; i <= runFrequency; i++) {
    console.info(`\nBuild run ${i}/${runFrequency}...`)
    rmBuildOutput(buildOutputPath)

    console.info('Cold build...')
    const coldBuildTimeMs = measureBuildTime(packageDir)
    coldBuildTimesMs.push(coldBuildTimeMs)
    console.info(`  Cold build time: ${coldBuildTimeMs}ms`)

    console.info('\nWarm build...')
    const warmBuildTimeMs = measureBuildTime(packageDir)
    warmBuildTimesMs.push(warmBuildTimeMs)
    console.info(`  Warm build time: ${warmBuildTimeMs}ms`)
  }

  const buildOutputSize = getDirectorySize(buildOutputPath)
  console.info(`\nBuild output size: ${buildOutputSize} bytes`)

  const coldBuildTime = {
    avgMs:
      coldBuildTimesMs.reduce((total, cur) => total + cur, 0) /
      coldBuildTimesMs.length,
    minMs: Math.min(...coldBuildTimesMs),
    maxMs: Math.max(...coldBuildTimesMs),
  }
  console.info(`\nAvg cold build time: ${coldBuildTime.avgMs} ms`)
  console.info(`\nMin cold build time: ${coldBuildTime.minMs} ms`)
  console.info(`\nMax cold build time: ${coldBuildTime.maxMs} ms`)

  const warmBuildTime = {
    avgMs:
      warmBuildTimesMs.reduce((total, cur) => total + cur, 0) /
      warmBuildTimesMs.length,
    minMs: Math.min(...warmBuildTimesMs),
    maxMs: Math.max(...warmBuildTimesMs),
  }
  console.info(`\nAvg warm build time: ${warmBuildTime.avgMs} ms`)
  console.info(`\nMin warm build time: ${warmBuildTime.minMs} ms`)
  console.info(`\nMax warm build time: ${warmBuildTime.maxMs} ms`)

  const stats: BuildStats = {
    coldBuildTime,
    warmBuildTime,
    buildOutputSize,
  }

  const outputPath = join(packagesDir, packageName, 'build-stats.json')
  writeJsonFile(outputPath, stats)

  console.info(`\n✓ Saved build stats to ${outputPath}`)
}

main().catch((error) => {
  console.error('Build benchmark failed:', error)
  process.exit(1)
})
