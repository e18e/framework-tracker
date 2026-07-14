import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { packagesDir } from './constants.ts'
import { getFrameworks } from './get-frameworks.ts'
import type {
  CIStats,
  FrameworkConfig,
  PackageJson,
  TestConfig,
} from './types.ts'

/**
 * Get directory size in bytes using du command.
 * Works on both Linux and macOS.
 */
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

export function getDependencyCountsFromPackageMetadata(packageName: string) {
  const packageJsonPath = join(packagesDir, packageName, 'package.json')
  const packageJson = JSON.parse(
    readFileSync(packageJsonPath, 'utf-8'),
  ) as PackageJson

  const lockfilePath = join(packagesDir, packageName, 'pnpm-lock.yaml')
  const allDependencies = existsSync(lockfilePath)
    ? countPnpmLockPackages(readFileSync(lockfilePath, 'utf-8'))
    : undefined

  return {
    prodDependencies: Object.keys(packageJson.dependencies ?? {}).length,
    devDependencies: Object.keys(packageJson.devDependencies ?? {}).length,
    allDependencies,
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
 * Keep generated stats on the current nested client-side-rendered shape.
 * This also cleans up older flat fields when merging existing stats files.
 */
export function normalizeCIStats<T extends CIStats>(stats: T): T {
  const legacyStats = stats as T & {
    serverRenderThroughputTests?: CIStats['ssrRequestThroughputTests']
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
    stats.ssrRequestThroughputTests == null &&
    legacyStats.serverRenderThroughputTests != null
  ) {
    stats.ssrRequestThroughputTests = legacyStats.serverRenderThroughputTests
  }

  if (
    stats.ssrRequestThroughputTests == null &&
    typeof legacyStats.ssrOpsPerSec === 'number' &&
    typeof legacyStats.ssrAvgLatencyMs === 'number' &&
    typeof legacyStats.ssrMedianLatencyMs === 'number' &&
    typeof legacyStats.ssrSamples === 'number' &&
    typeof legacyStats.ssrBodySizeKb === 'number' &&
    typeof legacyStats.ssrDuplicationFactor === 'number'
  ) {
    stats.ssrRequestThroughputTests = {
      opsPerSec: legacyStats.ssrOpsPerSec,
      avgLatencyMs: legacyStats.ssrAvgLatencyMs,
      medianLatencyMs: legacyStats.ssrMedianLatencyMs,
      samples: legacyStats.ssrSamples,
      bodySizeKb: legacyStats.ssrBodySizeKb,
      duplicationFactor: legacyStats.ssrDuplicationFactor,
    }
  }

  if (
    stats.clientSideRenderedTests == null &&
    typeof legacyStats.clientSideRenderedFirstPaintMs === 'number' &&
    typeof legacyStats.clientSideRenderedFCPMs === 'number' &&
    typeof legacyStats.clientSideRenderedINPMs === 'number' &&
    typeof legacyStats.clientSideRenderedRuns === 'number'
  ) {
    stats.clientSideRenderedTests = {
      firstPaintMs: legacyStats.clientSideRenderedFirstPaintMs,
      fcpMs: legacyStats.clientSideRenderedFCPMs,
      inpMs: legacyStats.clientSideRenderedINPMs,
      runs: legacyStats.clientSideRenderedRuns,
    }
  }

  if (
    stats.ssrLoadTests == null &&
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
    stats.ssrLoadTests = {
      peakWorkers: legacyStats.ssrLoadPeakWorkers,
      peakRequestsPerSec: legacyStats.ssrLoadPeakRequestsPerSec,
      peakAvgLatencyMs: legacyStats.ssrLoadPeakAvgLatencyMs,
      peakP50LatencyMs: legacyStats.ssrLoadPeakP50LatencyMs,
      peakP75LatencyMs: legacyStats.ssrLoadPeakP75LatencyMs,
      peakP90LatencyMs: legacyStats.ssrLoadPeakP90LatencyMs,
      peakP99LatencyMs: legacyStats.ssrLoadPeakP99LatencyMs,
      totalRequests: legacyStats.ssrLoadTotalRequests,
      totalErrors: legacyStats.ssrLoadTotalErrors,
      stages: legacyStats.ssrLoadStages as NonNullable<
        CIStats['ssrLoadTests']
      >['stages'],
    }
  }

  if (
    stats.serverSideRenderedTests == null &&
    typeof legacyStats.mpaFirstPaintMs === 'number' &&
    typeof legacyStats.mpaFCPMs === 'number' &&
    typeof legacyStats.mpaINPMs === 'number' &&
    typeof legacyStats.mpaRuns === 'number'
  ) {
    stats.serverSideRenderedTests = {
      firstPaintMs: legacyStats.mpaFirstPaintMs,
      fcpMs: legacyStats.mpaFCPMs,
      inpMs: legacyStats.mpaINPMs,
      runs: legacyStats.mpaRuns,
    }
  }

  if (
    stats.browserBaselineTests == null &&
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
    stats.browserBaselineTests = {
      baselineStatus: legacyStats.baselineStatus,
      baselineYear: legacyStats.baselineYear,
      baselineReason: legacyStats.baselineReason,
      baselineFeatureCount: legacyStats.baselineFeatureCount,
    }
  }

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
