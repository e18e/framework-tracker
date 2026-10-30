import {
  readProjectResult,
  saveProjectResult,
  mergeProjectResult,
  resultLocation,
  type CombinedResult,
} from '@framework-tracker/results/storage'
import {
  DependencyScanSchema,
  CoreJsStatsSchema,
  NodeEnginesStatsSchema,
  BrowserBaselineStatsSchema,
  FrameworkDependencyScanSchema,
  FirstPartyDependencyScanSchema,
  ServerSideRenderedStatsSchema,
  InitialLoadResultSchema,
  ClientSideRenderedStatsSchema,
  BuildStatsSchema,
  DevServerStatsSchema,
  BaseResultSchema,
  InstallResultSchema,
  FrameworkResultSchema,
  type FrameworkResult,
} from '@framework-tracker/results'
import { withSummaryVariance } from '@framework-tracker/results/comparison'
import { validateSSRLoadForPersistence } from './ssrLoad/persistence.ts'
import {
  mergeRequestThroughputArtifact,
  validateRequestThroughputForPersistence,
} from './request-throughput.ts'
import { mergeSSRLoadArtifact } from './ssrLoad/merge.ts'
import { join } from 'node:path'
import { getFrameworks } from './get-frameworks.ts'
import { readFileSync } from 'node:fs'
import { getPublishTimes, withReleasedAt } from './release-dates.ts'
import {
  getDependencyCountsFromPackageMetadata,
  getDependencyStatsFromE18e,
  getPackageJsonDeps,
  normalizeCIStats,
} from './utils.ts'
import type {
  CIStats,
  InstallResult,
  BuildStats,
  DevServerStats,
  CoreJsStats,
  BrowserBaselineStats,
  NodeEnginesStats,
  DependencyStats,
  FirstPartyDependencyStats,
  E18eStats,
  FrameworkConfig,
  TestConfig,
} from './types.ts'

const publishTimesCache = new Map<string, Promise<Record<string, string>>>()

async function getReleasedAt(
  frameworkPackage: string,
  frameworkVersion: string | undefined,
): Promise<string | undefined> {
  if (!frameworkVersion || frameworkVersion === 'unknown') return undefined

  try {
    if (!publishTimesCache.has(frameworkPackage)) {
      publishTimesCache.set(frameworkPackage, getPublishTimes(frameworkPackage))
    }
    const releasedAt = (await publishTimesCache.get(frameworkPackage)!)[
      frameworkVersion
    ]
    if (releasedAt == null) {
      console.warn(
        `No publish time found for ${frameworkPackage}@${frameworkVersion}`,
      )
    }
    return releasedAt
  } catch (error) {
    throw new Error(
      `Failed to fetch publish time for ${frameworkPackage}@${frameworkVersion}`,
      { cause: error },
    )
  }
}

export async function processCIStats(
  artifactsDir: string,
  {
    validateOnly = false,
    requireAllArtifacts = false,
    frameworks: configuredFrameworks,
  }: {
    validateOnly?: boolean
    requireAllArtifacts?: boolean
    frameworks?: FrameworkConfig[]
  } = {},
) {
  const timestamp = new Date().toISOString()
  const runner = process.env.RUNNER_LABEL || 'local'

  console.info(validateOnly ? 'Validating CI stats...' : 'Saving CI stats...')
  console.info(`  Artifacts directory: ${artifactsDir}`)
  console.info(`  Timestamp: ${timestamp}`)
  console.info(`  Runner: ${runner}\n`)

  const frameworks = configuredFrameworks ?? (await getFrameworks())

  function readArtifact<T>(
    filePath: string,
    project: TestConfig,
    measurement: TestConfig['measurements'][number],
  ): T | null {
    const required =
      requireAllArtifacts && project.measurements.includes(measurement)
    try {
      const data: unknown = JSON.parse(readFileSync(filePath, 'utf8'))
      if (data === null || typeof data !== 'object' || Array.isArray(data))
        throw new Error('Expected a stats object')
      return data as T
    } catch (error) {
      if (
        !required &&
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      )
        return null
      throw new Error(`Missing or invalid measurement artifact: ${filePath}`, {
        cause: error,
      })
    }
  }

  const projectStats = new Map<string, FrameworkResult>()
  const combinedStats = new Map<string, CombinedResult>()
  function collect(
    packageName: string,
    stats: CIStats,
    existing: CIStats | null,
  ) {
    validateSSRLoadForPersistence(stats)
    validateRequestThroughputForPersistence(stats)
    const { framework } = resultLocation(packageName)
    const measuredTests = Object.keys(stats).filter(
      (key) => stats[key as keyof CIStats] !== existing?.[key as keyof CIStats],
    )
    const comparedStats = withSummaryVariance(
      FrameworkResultSchema.parse(stats),
      FrameworkResultSchema.nullable().parse(existing),
      measuredTests,
    )
    combinedStats.set(
      framework,
      mergeProjectResult(combinedStats.get(framework) ?? null, packageName, {
        ...comparedStats,
      }),
    )
    projectStats.set(packageName, comparedStats)
  }

  for (const framework of frameworks) {
    const { name, displayName } = framework

    // Process starter stats
    if (framework.starter) {
      const packageName = framework.starter.package
      console.info(`Processing ${displayName} starter (${packageName})...`)

      const existingStats = readProjectResult(packageName) as CIStats | null

      let stats: CIStats = {
        // Partial previews can merge stored measurements; full CI uses fresh artifacts only.
        ...(!requireAllArtifacts && existingStats
          ? normalizeCIStats(existingStats)
          : {}),
        ...BaseResultSchema.parse({
          framework: framework.name,
          packagePath: `packages/${packageName}`,
          timingMeasuredAt: timestamp,
          runner,
        }),
      }

      let frameworkVersion = requireAllArtifacts
        ? undefined
        : existingStats?.frameworkVersion

      // Load install stats from artifact
      const installStatsPath = join(
        artifactsDir,
        `install-stats-${name}`,
        'install-stats.json',
      )
      const installStats = readArtifact<InstallResult>(
        installStatsPath,
        framework.starter,
        'install',
      )

      if (installStats) {
        InstallResultSchema.parse(installStats)
        console.info(`  ✓ Found install stats artifact`)
        stats = {
          ...stats,
          frameworkVersion: installStats.frameworkVersion,
          install: installStats.install,
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
      const buildStats = readArtifact<BuildStats>(
        buildStatsPath,
        framework.starter,
        'build',
      )

      if (buildStats) {
        BuildStatsSchema.parse(buildStats)
        console.info(`  ✓ Found build stats artifact`)
        stats = {
          ...stats,
          coldBuildTime: buildStats.coldBuildTime,
          warmBuildTime: buildStats.warmBuildTime,
        }
      } else {
        console.warn(`No build stats artifact found at ${buildStatsPath}`)
      }

      const devServerStatsPath = join(
        artifactsDir,
        `dev-server-stats-${name}`,
        'dev-server-stats.json',
      )
      const devServerStats = readArtifact<DevServerStats>(
        devServerStatsPath,
        framework.starter,
        'devServer',
      )

      if (devServerStats) {
        DevServerStatsSchema.parse(devServerStats)
        console.info(`  ✓ Found dev server stats artifact`)
        stats = {
          ...stats,
          devServerStartTime: devServerStats.devServerStartTime,
        }
      } else {
        console.warn(
          `No dev server stats artifact found at ${devServerStatsPath}`,
        )
      }

      // Load core-js stats from artifact
      const coreJsArtifactPath = join(
        artifactsDir,
        `corejs-stats-${name}`,
        'corejs-stats.json',
      )
      const coreJsStats = readArtifact<CoreJsStats>(
        coreJsArtifactPath,
        framework.starter,
        'build',
      )
      if (coreJsStats) {
        console.info(`  ✓ Found core-js stats artifact`)
        stats = {
          ...stats,
          corejs: CoreJsStatsSchema.parse({ ...coreJsStats, name: 'corejs' }),
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
      const browserBaselineStats = readArtifact<BrowserBaselineStats>(
        browserBaselineArtifactPath,
        framework.starter,
        'browserBaseline',
      )
      if (browserBaselineStats) {
        console.info(`  ✓ Found browser baseline stats artifact`)
        stats = {
          ...stats,
          browserBaselineTests: BrowserBaselineStatsSchema.parse({
            ...browserBaselineStats,
            name: 'browserBaseline',
          }),
        }
      } else {
        console.warn(
          `No browser baseline stats artifact found at ${browserBaselineArtifactPath}`,
        )
      }

      const nodeEnginesArtifactPath = join(
        artifactsDir,
        `node-engines-stats-${name}`,
        'node-engines-stats.json',
      )
      const nodeEnginesStats = readArtifact<NodeEnginesStats>(
        nodeEnginesArtifactPath,
        framework.starter,
        'dependencies',
      )
      if (nodeEnginesStats) {
        console.info(`  ✓ Found Node engines stats artifact`)
        stats.nodeEngines = NodeEnginesStatsSchema.parse({
          ...nodeEnginesStats,
          name: 'nodeEngines',
        })
        if (nodeEnginesStats.minimumNodeVersion) {
          stats = {
            ...stats,
            minimumNodeVersion: nodeEnginesStats.minimumNodeVersion,
            minimumNodeVersionImposedBy: nodeEnginesStats.imposedBy,
          }
        }
      } else {
        console.warn(
          `No Node engines stats artifact found at ${nodeEnginesArtifactPath}`,
        )
      }

      // Load dependency stats from artifacts
      const e18eArtifactPath = join(
        artifactsDir,
        `e18e-stats-${name}`,
        'e18e-stats.json',
      )
      const frameworkDependencyStatsPath = join(
        artifactsDir,
        `e18e-stats-${name}`,
        'framework-dependency-stats.json',
      )
      const frameworkDependencies = readArtifact<DependencyStats>(
        frameworkDependencyStatsPath,
        framework.starter,
        'dependencies',
      )
      if (frameworkDependencies) {
        console.info(`  ✓ Found framework dependency stats artifact`)
        stats = {
          ...stats,
          frameworkDependencies: FrameworkDependencyScanSchema.parse({
            ...frameworkDependencies,
            name: 'frameworkDependencies',
          }),
        }
      } else {
        console.warn(
          `No framework dependency stats artifact found at ${frameworkDependencyStatsPath}`,
        )
      }

      const firstPartyDependencyStatsPath = join(
        artifactsDir,
        `e18e-stats-${name}`,
        'first-party-dependency-stats.json',
      )
      const firstPartyDependencies = readArtifact<FirstPartyDependencyStats>(
        firstPartyDependencyStatsPath,
        framework.starter,
        'dependencies',
      )
      if (firstPartyDependencies) {
        console.info(`  ✓ Found first-party dependency stats artifact`)
        stats = {
          ...stats,
          firstPartyDependencies: FirstPartyDependencyScanSchema.parse({
            ...firstPartyDependencies,
            name: 'firstPartyDependencies',
          }),
        }
      } else {
        console.warn(
          `No first-party dependency stats artifact found at ${firstPartyDependencyStatsPath}`,
        )
      }

      const e18eStats = readArtifact<E18eStats>(
        e18eArtifactPath,
        framework.starter,
        'dependencies',
      )
      if (e18eStats) {
        console.info(`  ✓ Found e18e stats artifact`)
        const packageDependencyCounts =
          getDependencyCountsFromPackageMetadata(packageName)
        stats = {
          ...stats,
          ...DependencyScanSchema.omit({ name: true }).parse({
            ...getDependencyStatsFromE18e(e18eStats),
            allDependencies: packageDependencyCounts.allDependencies,
          }),
          dependencyScan: DependencyScanSchema.parse({
            name: 'dependencies',
            ...getDependencyStatsFromE18e(e18eStats),
            allDependencies: packageDependencyCounts.allDependencies,
          }),
        }
      } else {
        console.warn(`No e18e stats artifact found at ${e18eArtifactPath}`)
      }

      // check for releasedAt, if not fetch from repository
      const releasedAt =
        existingStats?.frameworkVersion === frameworkVersion &&
        existingStats?.releasedAt
          ? existingStats?.releasedAt
          : await getReleasedAt(framework.frameworkPackage, frameworkVersion)

      stats = withReleasedAt(
        {
          ...stats,
          packageJson: getPackageJsonDeps(packageName),
        },
        releasedAt,
      )

      collect(packageName, stats, existingStats)

      console.info('')
    }

    // Process app stats
    if (framework.app) {
      const packageName = framework.app.package
      console.info(`Processing ${displayName} app (${packageName})...`)

      const existingStats = readProjectResult(packageName) as CIStats | null

      let stats: CIStats = {
        // Partial previews can merge stored measurements; full CI uses fresh artifacts only.
        ...(!requireAllArtifacts && existingStats
          ? normalizeCIStats(existingStats)
          : {}),
        ...BaseResultSchema.parse({
          framework: framework.name,
          packagePath: `packages/${packageName}`,
          timingMeasuredAt: timestamp,
          runner,
        }),
      }

      let frameworkVersion = requireAllArtifacts
        ? undefined
        : existingStats?.frameworkVersion

      // Load SSR request throughput stats from artifact
      const ssrRequestThroughputStatsPath = join(
        artifactsDir,
        `ssr-request-throughput-stats-${name}`,
        'ci-stats.json',
      )
      const rawSSRRequestThroughputStats = readArtifact<CIStats>(
        ssrRequestThroughputStatsPath,
        framework.app,
        'ssrRequestThroughput',
      )
      const ssrRequestThroughputStats = rawSSRRequestThroughputStats
        ? normalizeCIStats(rawSSRRequestThroughputStats)
        : null

      if (ssrRequestThroughputStats) {
        console.info(`  ✓ Found SSR request throughput stats artifact`)
        stats = mergeRequestThroughputArtifact(stats, ssrRequestThroughputStats)
        frameworkVersion = stats.frameworkVersion
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
      const rawSSRLoadStats = readArtifact<CIStats>(
        ssrLoadStatsPath,
        framework.app,
        'ssrLoad',
      )
      const ssrLoadStats = rawSSRLoadStats
        ? normalizeCIStats(rawSSRLoadStats)
        : null

      if (ssrLoadStats) {
        console.info(`  ✓ Found SSR load stats artifact`)
        stats = mergeSSRLoadArtifact(stats, ssrLoadStats, 'ssrLoad')
        frameworkVersion = ssrLoadStats.frameworkVersion ?? frameworkVersion
      } else {
        console.warn(`No SSR load stats artifact found at ${ssrLoadStatsPath}`)
      }

      // Load SSR router link load stats from artifact
      const ssrRouterLinkLoadStatsPath = join(
        artifactsDir,
        `ssr-router-link-load-stats-${name}`,
        'ci-stats.json',
      )
      const rawSSRRouterLinkLoadStats = readArtifact<CIStats>(
        ssrRouterLinkLoadStatsPath,
        framework.app,
        'ssrRouterLinkLoad',
      )
      const ssrRouterLinkLoadStats = rawSSRRouterLinkLoadStats
        ? normalizeCIStats(rawSSRRouterLinkLoadStats)
        : null

      if (ssrRouterLinkLoadStats) {
        console.info(`  ✓ Found SSR router link load stats artifact`)
        stats = mergeSSRLoadArtifact(
          stats,
          ssrRouterLinkLoadStats,
          'ssrRouterLinkLoad',
        )
        frameworkVersion =
          ssrRouterLinkLoadStats.frameworkVersion ?? frameworkVersion
      } else {
        console.warn(
          `No SSR router link load stats artifact found at ${ssrRouterLinkLoadStatsPath}`,
        )
      }

      // Load client-side rendered stats from artifact
      const clientSideRenderedStatsArtifactPath = join(
        artifactsDir,
        `client-side-rendered-stats-${name}`,
        'ci-stats.json',
      )
      const rawClientSideRenderedStats = readArtifact<CIStats>(
        clientSideRenderedStatsArtifactPath,
        framework.app,
        'clientSideRendered',
      )
      const clientSideRenderedStats = rawClientSideRenderedStats
        ? normalizeCIStats(rawClientSideRenderedStats)
        : null

      if (clientSideRenderedStats) {
        ClientSideRenderedStatsSchema.parse(clientSideRenderedStats)
        console.info(`  ✓ Found client-side rendered stats artifact`)
        stats = {
          ...stats,
          browserVersion:
            clientSideRenderedStats.browserVersion ?? stats.browserVersion,
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
      const rawServerSideRenderedStats = readArtifact<CIStats>(
        serverSideRenderedStatsArtifactPath,
        framework.app,
        'serverSideRendered',
      )
      const serverSideRenderedStats = rawServerSideRenderedStats
        ? {
            ...normalizeCIStats(rawServerSideRenderedStats),
            ...ServerSideRenderedStatsSchema.parse(rawServerSideRenderedStats),
          }
        : null

      if (serverSideRenderedStats) {
        console.info(`  ✓ Found server-side rendered stats artifact`)
        stats = {
          ...stats,
          browserVersion:
            serverSideRenderedStats.browserVersion ?? stats.browserVersion,
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

      const initialLoadArtifactPath = join(
        artifactsDir,
        `initial-load-stats-${name}`,
        'ci-stats.json',
      )
      const initialLoadArtifact = readArtifact<unknown>(
        initialLoadArtifactPath,
        framework.app,
        'initialLoad',
      )
      if (initialLoadArtifact) {
        const initialLoad = InitialLoadResultSchema.parse(initialLoadArtifact)
        stats = {
          ...stats,
          browserVersion: initialLoad.browserVersion,
          frameworkVersion:
            initialLoad.frameworkVersion ?? stats.frameworkVersion,
          initialLoadTests: initialLoad.initialLoadTests,
        }
        frameworkVersion = initialLoad.frameworkVersion ?? frameworkVersion
        console.info('  ✓ Found initial load stats artifact')
      } else {
        console.warn(
          `No initial load stats artifact found at ${initialLoadArtifactPath}`,
        )
      }

      // check for releasedAt, if not fetch from repository
      const releasedAt =
        existingStats?.frameworkVersion === frameworkVersion &&
        existingStats?.releasedAt
          ? existingStats?.releasedAt
          : await getReleasedAt(framework.frameworkPackage, frameworkVersion)

      stats = withReleasedAt(
        {
          ...stats,
          packageJson: getPackageJsonDeps(packageName),
        },
        releasedAt,
      )

      collect(packageName, stats, existingStats)

      console.info('')
    }
  }

  if (!validateOnly)
    for (const [packageName, stats] of projectStats)
      saveProjectResult(packageName, { ...stats })

  console.info(
    validateOnly ? 'All CI stats are valid; no results written.' : 'Done!',
  )
  return combinedStats
}

if (import.meta.main) {
  const args = process.argv.slice(2)
  processCIStats(args.find((arg) => !arg.startsWith('--')) ?? 'artifacts', {
    validateOnly: args.includes('--validate-only'),
    requireAllArtifacts: args.includes('--require-all-artifacts'),
  }).catch((error) => {
    console.error('Failed to process CI stats:', error)
    process.exit(1)
  })
}
