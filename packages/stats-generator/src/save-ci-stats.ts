import { join } from 'node:path'
import { getFrameworks } from './get-frameworks.ts'
import { packagesDir } from './constants.ts'
import {
  getDependencyCountsFromPackageMetadata,
  normalizeCIStats,
  readJsonFile,
  writeJsonFile,
} from './utils.ts'
import type {
  CIStats,
  InstallStats,
  BuildStats,
  CoreJsStats,
  BrowserBaselineStats,
  E18eStats,
} from './types.ts'

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
        ...(existingStats ? normalizeCIStats(existingStats) : {}),
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
        console.warn(`No install stats artifact found at ${installStatsPath}`)
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
        console.warn(`No build stats artifact found at ${buildStatsPath}`)
      }

      // Load core-js stats from artifact
      const coreJsArtifactPath = join(
        artifactsDir,
        `corejs-stats-${name}`,
        'corejs-stats.json',
      )
      const coreJsStats = readJsonFile<CoreJsStats>(coreJsArtifactPath)
      if (coreJsStats) {
        console.info(`  ✓ Found core-js stats artifact`)
        stats = {
          ...stats,
          vendoredCoreJsSize: coreJsStats.totalVendoredBytes,
          vendoredCoreJsUnnecessaryModules: coreJsStats.unnecessaryModules,
        }
      } else {
        console.warn(
          ` No core-js stats artifact found at ${coreJsArtifactPath}`,
        )
      }

      // Load browser baseline stats from artifact
      const browserBaselineArtifactPath = join(
        artifactsDir,
        `browser-baseline-stats-${name}`,
        'browser-baseline-stats.json',
      )
      const browserBaselineStats = readJsonFile<BrowserBaselineStats>(
        browserBaselineArtifactPath,
      )
      if (browserBaselineStats) {
        console.info(`  ✓ Found browser baseline stats artifact`)
        stats = {
          ...stats,
          browserBaselineTests: browserBaselineStats,
        }
      } else {
        console.warn(
          `No browser baseline stats artifact found at ${browserBaselineArtifactPath}`,
        )
      }

      // Load e18e stats from artifact
      const e18eArtifactPath = join(
        artifactsDir,
        `e18e-stats-${name}`,
        'e18e-stats.json',
      )
      const e18eStats = readJsonFile<E18eStats>(e18eArtifactPath)
      if (e18eStats) {
        console.info(`  ✓ Found e18e stats artifact`)
        const packageDependencyCounts =
          getDependencyCountsFromPackageMetadata(packageName)
        const duplicateEntry = e18eStats.stats.extraStats?.find(
          (s) => s.name === 'duplicateDependencyCount',
        )
        const dependencyCounts = {
          prodDependencies: e18eStats.stats.dependencyCount.production,
          devDependencies: e18eStats.stats.dependencyCount.development,
          allDependencies: packageDependencyCounts.allDependencies,
        }
        stats = {
          ...stats,
          ...dependencyCounts,
          duplicateDependencies:
            typeof duplicateEntry?.value === 'number'
              ? duplicateEntry.value
              : undefined,
          depInstallSize: e18eStats.stats.installSize,
          e18eMessages: e18eStats.messages,
        }
      } else {
        console.warn(`No e18e stats artifact found at ${e18eArtifactPath}`)
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
        ...(existingStats ? normalizeCIStats(existingStats) : {}),
        timingMeasuredAt: timestamp,
        runner,
      }

      let frameworkVersion = existingStats?.frameworkVersion

      // Load SSR request throughput stats from artifact
      const ssrRequestThroughputStatsPath = join(
        artifactsDir,
        `ssr-request-throughput-stats-${name}`,
        'ci-stats.json',
      )
      const rawSSRRequestThroughputStats = readJsonFile<CIStats>(
        ssrRequestThroughputStatsPath,
      )
      const ssrRequestThroughputStats = rawSSRRequestThroughputStats
        ? normalizeCIStats(rawSSRRequestThroughputStats)
        : null

      if (ssrRequestThroughputStats) {
        console.info(`  ✓ Found SSR request throughput stats artifact`)
        stats = {
          ...stats,
          frameworkVersion: ssrRequestThroughputStats.frameworkVersion,
          ssrRequestThroughputTests:
            ssrRequestThroughputStats.ssrRequestThroughputTests,
        }
        frameworkVersion = ssrRequestThroughputStats.frameworkVersion
      } else {
        console.warn(
          `No SSR request throughput stats artifact found at ${ssrRequestThroughputStatsPath}`,
        )
      }

      // Load SSR load stats from artifact
      const ssrLoadStatsPath = join(
        artifactsDir,
        `ssr-load-stats-${name}`,
        'ci-stats.json',
      )
      const rawSSRLoadStats = readJsonFile<CIStats>(ssrLoadStatsPath)
      const ssrLoadStats = rawSSRLoadStats
        ? normalizeCIStats(rawSSRLoadStats)
        : null

      if (ssrLoadStats) {
        console.info(`  ✓ Found SSR load stats artifact`)
        stats = {
          ...stats,
          frameworkVersion:
            ssrLoadStats.frameworkVersion ?? stats.frameworkVersion,
          ssrLoadTests: ssrLoadStats.ssrLoadTests,
        }
        frameworkVersion = ssrLoadStats.frameworkVersion ?? frameworkVersion
      } else {
        console.warn(`No SSR load stats artifact found at ${ssrLoadStatsPath}`)
      }

      // Load client-side rendered stats from artifact
      const clientSideRenderedStatsArtifactPath = join(
        artifactsDir,
        `client-side-rendered-stats-${name}`,
        'ci-stats.json',
      )
      const rawClientSideRenderedStats = readJsonFile<CIStats>(
        clientSideRenderedStatsArtifactPath,
      )
      const clientSideRenderedStats = rawClientSideRenderedStats
        ? normalizeCIStats(rawClientSideRenderedStats)
        : null

      if (clientSideRenderedStats) {
        console.info(`  ✓ Found client-side rendered stats artifact`)
        stats = {
          ...stats,
          clientSideRenderedTests:
            clientSideRenderedStats.clientSideRenderedTests,
        }
      } else {
        console.warn(
          `No client-side rendered stats artifact found at ${clientSideRenderedStatsArtifactPath}`,
        )
      }

      // Load server-side rendered stats from artifact
      const serverSideRenderedStatsArtifactPath = join(
        artifactsDir,
        `server-side-rendered-stats-${name}`,
        'ci-stats.json',
      )
      const rawServerSideRenderedStats = readJsonFile<CIStats>(
        serverSideRenderedStatsArtifactPath,
      )
      const serverSideRenderedStats = rawServerSideRenderedStats
        ? normalizeCIStats(rawServerSideRenderedStats)
        : null

      if (serverSideRenderedStats) {
        console.info(`  ✓ Found server-side rendered stats artifact`)
        stats = {
          ...stats,
          frameworkVersion: serverSideRenderedStats.frameworkVersion,
          serverSideRenderedTests:
            serverSideRenderedStats.serverSideRenderedTests,
        }
        frameworkVersion =
          serverSideRenderedStats.frameworkVersion ?? frameworkVersion
      } else {
        console.warn(
          `No server-side rendered stats artifact found at ${serverSideRenderedStatsArtifactPath}`,
        )
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
