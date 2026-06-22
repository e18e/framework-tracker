import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { getFrameworks } from './get-frameworks.ts'
import type { CIStats, FrameworkConfig, TestConfig } from './types.ts'

/**
 * Get directory size in bytes using du command.
 * Works on both Linux and macOS.
 */
export function getDirectorySize(dirPath: string): number {
  try {
    const output = execFileSync('du', ['-sk', dirPath], { encoding: 'utf-8' })
    const sizeKb = parseInt(output.split(/\s+/)[0], 10)
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
  writeFileSync(filePath, JSON.stringify(data, null, 2))
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
    clientSideRenderedFirstPaintMs?: unknown
    clientSideRenderedFCPMs?: unknown
    clientSideRenderedINPMs?: unknown
    clientSideRenderedRuns?: unknown
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

  delete legacyStats.ssrOpsPerSec
  delete legacyStats.serverRenderThroughputTests
  delete legacyStats.ssrAvgLatencyMs
  delete legacyStats.ssrMedianLatencyMs
  delete legacyStats.ssrSamples
  delete legacyStats.ssrBodySizeKb
  delete legacyStats.ssrDuplicationFactor
  delete legacyStats.clientSideRenderedFirstPaintMs
  delete legacyStats.clientSideRenderedFCPMs
  delete legacyStats.clientSideRenderedINPMs
  delete legacyStats.clientSideRenderedRuns
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
