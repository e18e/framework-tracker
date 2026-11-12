import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { packagesDir } from './constants.ts'
import { getFrameworks } from './get-frameworks.ts'
import type {
  CIStats,
  DependencyStats,
  E18eStats,
  FrameworkConfig,
  PackageJson,
  TestConfig,
} from './types.ts'

/** Get directory size in bytes using du on Linux and macOS. */
export function getDirectorySize(dirPath: string): number {
  try {
    const output = execFileSync('du', ['-sk', dirPath], { encoding: 'utf-8' })
    const sizeKb = Number.parseInt(output.split(/\s+/)[0], 10)
    return sizeKb * 1024
  } catch (error) {
    console.warn(`Warning: Could not get directory size for ${dirPath}:`, error)
    return 0
  }
}

/**
 * Read and parse a JSON file. Returns null if file doesn't exist or can't be parsed.
 */
export function readJsonFile<T>(filePath: string): T | null {
  try {
    if (!existsSync(filePath)) {
      return null
    }
    const content = readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as T
  } catch (error) {
    console.warn(`Warning: Failed to read ${filePath}:`, error)
    return null
  }
}

/**
 * Write data to a JSON file, creating directories if needed.
 */
export function writeJsonFile(filePath: string, data: unknown): void {
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`)
}

export function getDependencyStatsFromE18e(e18eStats: E18eStats) {
  const duplicateEntry = e18eStats.stats.extraStats?.find(
    (stat) => stat.name === 'duplicateDependencyCount',
  )

  return {
    productionDependencyCount: {
      value: e18eStats.stats.dependencyCount.production,
      unit: 'count',
    },
    developmentDependencyCount: {
      value: e18eStats.stats.dependencyCount.development,
      unit: 'count',
    },
    duplicateDependencyCount:
      typeof duplicateEntry?.value === 'number'
        ? { value: duplicateEntry.value, unit: 'count' }
        : undefined,
    dependencyInstallSize:
      e18eStats.stats.installSize == null
        ? undefined
        : { value: e18eStats.stats.installSize, unit: 'bytes' },
  }
}

function countPnpmLockPackages(lockfileContent: string): number {
  const packageEntryPattern = /^ {2}\S.*:\s*$/
  const lines = lockfileContent.split(/\r?\n/)
  const packagesIndex = lines.findIndex((line) => line === 'packages:')
  if (packagesIndex === -1) {
    return 0
  }

  let count = 0
  for (const line of lines.slice(packagesIndex + 1)) {
    if (/^\S/.test(line)) {
      break
    }

    if (packageEntryPattern.test(line)) {
      count += 1
    }
  }

  return count
}

export function getPackageJsonDeps(packageName: string) {
  const packageJsonPath = join(packagesDir, packageName, 'package.json')
  const packageJson = JSON.parse(
    readFileSync(packageJsonPath, 'utf-8'),
  ) as PackageJson

  return {
    dependencies: packageJson.dependencies ?? {},
    devDependencies: packageJson.devDependencies ?? {},
  }
}

export function getDependencyCountsFromPackageMetadata(packageName: string) {
  const { dependencies, devDependencies } = getPackageJsonDeps(packageName)

  const lockfilePath = join(packagesDir, packageName, 'pnpm-lock.yaml')
  const totalDependencyCount = existsSync(lockfilePath)
    ? countPnpmLockPackages(readFileSync(lockfilePath, 'utf-8'))
    : undefined

  return {
    productionDependencyCount: {
      value: Object.keys(dependencies).length,
      unit: 'count',
    },
    developmentDependencyCount: {
      value: Object.keys(devDependencies).length,
      unit: 'count',
    },
    totalDependencyCount:
      totalDependencyCount == null
        ? undefined
        : { value: totalDependencyCount, unit: 'count' },
  }
}

function getFrameworkDependencyName(frameworkPackage: string): string {
  return frameworkPackage.startsWith('jsr:')
    ? frameworkPackage.slice('jsr:'.length)
    : frameworkPackage
}

export function getFrameworkDependencyCountsFromPackageMetadata(
  starterPackageName: string,
  frameworkPackage: string,
): DependencyStats {
  // pnpm exposes JSR dependencies under their package name in node_modules.
  const installedPackageName = getFrameworkDependencyName(frameworkPackage)
  const packageJsonPath = join(
    packagesDir,
    starterPackageName,
    'node_modules',
    installedPackageName,
    'package.json',
  )
  const packageJson = JSON.parse(
    readFileSync(packageJsonPath, 'utf-8'),
  ) as PackageJson
  const dependencies = packageJson.dependencies ?? {}
  const devDependencies = packageJson.devDependencies ?? {}

  return {
    productionDependencyCount: {
      value: Object.keys(dependencies).length,
      unit: 'count',
    },
    developmentDependencyCount: {
      value: Object.keys(devDependencies).length,
      unit: 'count',
    },
    totalDependencyCount: {
      value: new Set([
        ...Object.keys(dependencies),
        ...Object.keys(devDependencies),
      ]).size,
      unit: 'count',
    },
  }
}

export async function getFrameworkVersion(
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
      version?: unknown
    }

    if (typeof pkgJson.version === 'string') {
      return pkgJson.version
    }
  } catch {
    // Fall through to the warning below.
  }

  console.warn(
    `Could not read version for ${frameworkPackage} in ${packageName}`,
  )
  return undefined
}

/**
 * Keep generated stats on the current shape and remove retired metrics and
 * older flat fields when merging existing stats files.
 */
export function normalizeCIStats<T extends CIStats>(stats: T): T {
  const legacyStats = stats as T & {
    nodeModulesSizeProdOnly?: unknown
    serverRenderThroughputTests?: CIStats['ssrRequestThroughput']
    ssrOpsPerSec?: unknown
    ssrAvgLatencyMs?: unknown
    ssrMedianLatencyMs?: unknown
    ssrSamples?: unknown
    ssrBodySizeKb?: unknown
    ssrDuplicationFactor?: unknown
    ssrLoadPeakWorkers?: unknown
    ssrLoadPeakRequestsPerSec?: unknown
    ssrLoadPeakAvgLatencyMs?: unknown
    ssrLoadPeakP50LatencyMs?: unknown
    ssrLoadPeakP75LatencyMs?: unknown
    ssrLoadPeakP90LatencyMs?: unknown
    ssrLoadPeakP99LatencyMs?: unknown
    ssrLoadPeakP95LatencyMs?: unknown
    ssrLoadPeakP97_5LatencyMs?: unknown
    ssrLoadTotalRequests?: unknown
    ssrLoadTotalErrors?: unknown
    ssrLoadStages?: unknown
    clientSideRenderedFirstPaintMs?: unknown
    clientSideRenderedFCPMs?: unknown
    clientSideRenderedINPMs?: unknown
    clientSideRenderedRuns?: unknown
    baselineStatus?: unknown
    baselineYear?: unknown
    baselineReason?: unknown
    baselineFeatureCount?: unknown
    mpaFirstPaintMs?: unknown
    mpaFCPMs?: unknown
    mpaINPMs?: unknown
    mpaRuns?: unknown
  }

  if (
    stats.ssrRequestThroughput == null &&
    legacyStats.serverRenderThroughputTests != null
  ) {
    stats.ssrRequestThroughput = legacyStats.serverRenderThroughputTests
  }

  if (
    stats.ssrRequestThroughput == null &&
    typeof legacyStats.ssrOpsPerSec === 'number' &&
    typeof legacyStats.ssrAvgLatencyMs === 'number' &&
    typeof legacyStats.ssrMedianLatencyMs === 'number' &&
    typeof legacyStats.ssrSamples === 'number' &&
    typeof legacyStats.ssrBodySizeKb === 'number' &&
    typeof legacyStats.ssrDuplicationFactor === 'number'
  ) {
    stats.ssrRequestThroughput = {
      requestThroughput: { value: legacyStats.ssrOpsPerSec, unit: 'ops/s' },
      avgLatency: { value: legacyStats.ssrAvgLatencyMs, unit: 'ms' },
      medianLatency: { value: legacyStats.ssrMedianLatencyMs, unit: 'ms' },
      requestCount: { value: legacyStats.ssrSamples, unit: 'requests' },
      bodySize: { value: legacyStats.ssrBodySizeKb, unit: 'KiB' },
      duplicationFactor: {
        value: legacyStats.ssrDuplicationFactor,
        unit: 'ratio',
      },
    }
  }

  if (
    stats.clientSideRendered == null &&
    typeof legacyStats.clientSideRenderedFirstPaintMs === 'number' &&
    typeof legacyStats.clientSideRenderedFCPMs === 'number' &&
    typeof legacyStats.clientSideRenderedINPMs === 'number' &&
    typeof legacyStats.clientSideRenderedRuns === 'number'
  ) {
    stats.clientSideRendered = {
      firstPaint: {
        value: legacyStats.clientSideRenderedFirstPaintMs,
        unit: 'ms',
      },
      firstContentfulPaint: {
        value: legacyStats.clientSideRenderedFCPMs,
        unit: 'ms',
      },
      inp: { value: legacyStats.clientSideRenderedINPMs, unit: 'ms' },
      runs: legacyStats.clientSideRenderedRuns,
    }
  }

  if (
    stats.ssrLoad == null &&
    typeof legacyStats.ssrLoadPeakWorkers === 'number' &&
    typeof legacyStats.ssrLoadPeakRequestsPerSec === 'number' &&
    typeof legacyStats.ssrLoadPeakAvgLatencyMs === 'number' &&
    typeof legacyStats.ssrLoadPeakP50LatencyMs === 'number' &&
    typeof legacyStats.ssrLoadPeakP75LatencyMs === 'number' &&
    typeof legacyStats.ssrLoadPeakP90LatencyMs === 'number' &&
    typeof legacyStats.ssrLoadPeakP99LatencyMs === 'number' &&
    typeof legacyStats.ssrLoadTotalRequests === 'number' &&
    typeof legacyStats.ssrLoadTotalErrors === 'number' &&
    Array.isArray(legacyStats.ssrLoadStages)
  ) {
    throw new Error(
      'Legacy flat SSR load result retains only a representative sweep; repeated sweeps cannot be recovered',
    )
  }

  if (
    stats.serverSideRendered == null &&
    typeof legacyStats.mpaFirstPaintMs === 'number' &&
    typeof legacyStats.mpaFCPMs === 'number' &&
    typeof legacyStats.mpaINPMs === 'number' &&
    typeof legacyStats.mpaRuns === 'number'
  ) {
    stats.serverSideRendered = {
      firstPaint: { value: legacyStats.mpaFirstPaintMs, unit: 'ms' },
      firstContentfulPaint: { value: legacyStats.mpaFCPMs, unit: 'ms' },
      inp: { value: legacyStats.mpaINPMs, unit: 'ms' },
      runs: legacyStats.mpaRuns,
    }
  }

  if (
    stats.browserBaseline == null &&
    (legacyStats.baselineStatus === 'high' ||
      legacyStats.baselineStatus === 'low' ||
      legacyStats.baselineStatus === false ||
      legacyStats.baselineStatus === null) &&
    (typeof legacyStats.baselineYear === 'number' ||
      legacyStats.baselineYear === null) &&
    (typeof legacyStats.baselineReason === 'string' ||
      legacyStats.baselineReason === null) &&
    typeof legacyStats.baselineFeatureCount === 'number'
  ) {
    stats.browserBaseline = {
      name: 'browserBaseline',
      baselineStatus: legacyStats.baselineStatus,
      baselineYear: legacyStats.baselineYear,
      baselineReason: legacyStats.baselineReason,
      baselineFeatureCount: {
        value: legacyStats.baselineFeatureCount,
        unit: 'count',
      },
    }
  }

  delete legacyStats.nodeModulesSizeProdOnly
  delete legacyStats.ssrOpsPerSec
  delete legacyStats.serverRenderThroughputTests
  delete legacyStats.ssrAvgLatencyMs
  delete legacyStats.ssrMedianLatencyMs
  delete legacyStats.ssrSamples
  delete legacyStats.ssrBodySizeKb
  delete legacyStats.ssrDuplicationFactor
  delete legacyStats.ssrLoadPeakWorkers
  delete legacyStats.ssrLoadPeakRequestsPerSec
  delete legacyStats.ssrLoadPeakAvgLatencyMs
  delete legacyStats.ssrLoadPeakP50LatencyMs
  delete legacyStats.ssrLoadPeakP75LatencyMs
  delete legacyStats.ssrLoadPeakP90LatencyMs
  delete legacyStats.ssrLoadPeakP99LatencyMs
  delete legacyStats.ssrLoadPeakP95LatencyMs
  delete legacyStats.ssrLoadPeakP97_5LatencyMs
  delete legacyStats.ssrLoadTotalRequests
  delete legacyStats.ssrLoadTotalErrors
  delete legacyStats.ssrLoadStages
  delete legacyStats.clientSideRenderedFirstPaintMs
  delete legacyStats.clientSideRenderedFCPMs
  delete legacyStats.clientSideRenderedINPMs
  delete legacyStats.clientSideRenderedRuns
  delete legacyStats.baselineStatus
  delete legacyStats.baselineYear
  delete legacyStats.baselineReason
  delete legacyStats.baselineFeatureCount
  delete legacyStats.mpaFirstPaintMs
  delete legacyStats.mpaFCPMs
  delete legacyStats.mpaINPMs
  delete legacyStats.mpaRuns

  return stats
}

/**
 * Find a framework by package name (searching both starter and app sections).
 * Exits with error if not found.
 */
export async function getFrameworkByPackage(
  packageName: string,
): Promise<{ framework: FrameworkConfig; testConfig: TestConfig }> {
  const frameworks = await getFrameworks()

  for (const framework of frameworks) {
    if (framework.starter?.package === packageName) {
      return { framework, testConfig: framework.starter }
    }
    if (framework.app?.package === packageName) {
      return { framework, testConfig: framework.app }
    }
  }

  console.error(`Unknown package: ${packageName}`)
  process.exit(1)
}

/**
 * Parse command line arguments for benchmark scripts.
 */
export function parseArgs(usage: string): {
  packageName: string
  args: string[]
} {
  const packageName = process.argv[2]

  if (!packageName) {
    console.error(usage)
    process.exit(1)
  }

  return { packageName, args: process.argv.slice(3) }
}
