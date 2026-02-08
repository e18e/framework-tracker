import { join } from 'node:path'
import { getFrameworks } from './get-frameworks.ts'
import { packagesDir } from './constants.ts'
import { readJsonFile, writeJsonFile } from './utils.ts'
import type { CIStats, InstallStats, BuildStats } from './types.ts'

async function main() {
  const artifactsDir = process.argv[2] || 'artifacts'
  const timestamp = new Date().toISOString()
  const runner = process.env.RUNNER_LABEL || 'local'

  console.info('Saving CI stats...')
  console.info(`  Artifacts directory: ${artifactsDir}`)
  console.info(`  Timestamp: ${timestamp}`)
  console.info(`  Runner: ${runner}\n`)

  const frameworks = await getFrameworks()

  for (const framework of frameworks) {
    const { name, displayName } = framework

    // Process starter stats
    if (framework.starter) {
      const packageName = framework.starter.package
      console.info(`Processing ${displayName} starter (${packageName})...`)

      const existingStatsPath = join(packagesDir, packageName, 'ci-stats.json')
      const existingStats = readJsonFile<CIStats>(existingStatsPath)

      let stats: CIStats = {
        ...existingStats,
        timingMeasuredAt: timestamp,
        runner,
      }

      let frameworkVersion = existingStats?.frameworkVersion

      // Load install stats from artifact
      const installStatsPath = join(
        artifactsDir,
        `install-stats-${name}`,
        'install-stats.json',
      )
      const installStats = readJsonFile<InstallStats>(installStatsPath)

      if (installStats) {
        console.info(`  ✓ Found install stats artifact`)
        stats = {
          ...stats,
          frameworkVersion: installStats.frameworkVersion,
          installTime: installStats.installTime,
          nodeModulesSize: installStats.nodeModulesSize,
          nodeModulesSizeProdOnly: installStats.nodeModulesSizeProdOnly,
        }
        frameworkVersion = installStats.frameworkVersion
      } else {
        console.info(
          `  ⚠ No install stats artifact found at ${installStatsPath}`,
        )
      }

      // Load build stats from artifact
      const buildStatsPath = join(
        artifactsDir,
        `build-stats-${name}`,
        'build-stats.json',
      )
      const buildStats = readJsonFile<BuildStats>(buildStatsPath)

      if (buildStats) {
        console.info(`  ✓ Found build stats artifact`)
        stats = {
          ...stats,
          coldBuildTime: buildStats.coldBuildTime,
          warmBuildTime: buildStats.warmBuildTime,
          buildOutputSize: buildStats.buildOutputSize,
        }
      } else {
        console.info(`  ⚠ No build stats artifact found at ${buildStatsPath}`)
      }

      // Save to ci-stats.json
      const ciStatsPath = join(packagesDir, packageName, 'ci-stats.json')
      writeJsonFile(ciStatsPath, stats)
      console.info(`  ✓ Saved ${ciStatsPath}`)

      // Save versioned stats if we have a valid version
      if (frameworkVersion && frameworkVersion !== 'unknown') {
        const versionedPath = join(
          packagesDir,
          packageName,
          'stats',
          `${frameworkVersion}.json`,
        )
        writeJsonFile(versionedPath, stats)
        console.info(`  ✓ Saved ${versionedPath}`)
      }

      console.info('')
    }

    // Process app stats
    if (framework.app) {
      const packageName = framework.app.package
      console.info(`Processing ${displayName} app (${packageName})...`)

      const existingStatsPath = join(packagesDir, packageName, 'ci-stats.json')
      const existingStats = readJsonFile<CIStats>(existingStatsPath)

      let stats: CIStats = {
        ...existingStats,
        timingMeasuredAt: timestamp,
        runner,
      }

      let frameworkVersion = existingStats?.frameworkVersion

      // Load SSR stats from artifact
      const ssrStatsPath = join(
        artifactsDir,
        `ssr-stats-${name}`,
        'ci-stats.json',
      )
      const ssrStats = readJsonFile<CIStats>(ssrStatsPath)

      if (ssrStats) {
        console.info(`  ✓ Found SSR stats artifact`)
        stats = {
          ...stats,
          frameworkVersion: ssrStats.frameworkVersion,
          ssrOpsPerSec: ssrStats.ssrOpsPerSec,
          ssrAvgLatencyMs: ssrStats.ssrAvgLatencyMs,
          ssrSamples: ssrStats.ssrSamples,
          ssrBodySizeKb: ssrStats.ssrBodySizeKb,
          ssrDuplicationFactor: ssrStats.ssrDuplicationFactor,
        }
        frameworkVersion = ssrStats.frameworkVersion
      } else {
        console.info(`  ⚠ No SSR stats artifact found at ${ssrStatsPath}`)
      }

      // Save to ci-stats.json
      const ciStatsPath = join(packagesDir, packageName, 'ci-stats.json')
      writeJsonFile(ciStatsPath, stats)
      console.info(`  ✓ Saved ${ciStatsPath}`)

      // Save versioned stats if we have a valid version
      if (frameworkVersion && frameworkVersion !== 'unknown') {
        const versionedPath = join(
          packagesDir,
          packageName,
          'stats',
          `${frameworkVersion}.json`,
        )
        writeJsonFile(versionedPath, stats)
        console.info(`  ✓ Saved ${versionedPath}`)
      }

      console.info('')
    }
  }

  console.info('Done!')
}

main().catch((error) => {
  console.error('Failed to save CI stats:', error)
  process.exit(1)
})
