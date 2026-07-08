import { access, copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import {
  detectBaselineTarget,
  detectBaselineYear,
  detectFeatures,
} from 'baseline-detector'
import { glob } from 'tinyglobby'
import { packagesDir } from './constants.ts'
import { getFrameworkByPackage, parseArgs, writeJsonFile } from './utils.ts'
import type { BrowserBaselineStats } from './types.ts'

type BaselineStatus = BrowserBaselineStats['baselineStatus']
type BrowserBaselineTarget = {
  status: BaselineStatus
  reason: string | null
}

const IGNORED_BUILD_SEGMENTS = [
  '/build/',
  '/cache/',
  '/diagnostics/',
  '/server/',
  '/standalone/',
  '/trace/',
  '/types/',
]
const IGNORED_BUILD_FILES = [
  '/env.js',
  '/handler.js',
  '/index.js',
  '/required-server-files.js',
  '/shims.js',
]
const SOURCE_FILE_GLOB = '**/*.{js,jsx,mjs,cjs,ts,mts,cts,tsx,vue,svelte}'

function normalizeBaselineTarget(
  featureIds: string[],
  target: Awaited<ReturnType<typeof detectBaselineTarget>>,
): BrowserBaselineTarget {
  if (featureIds.length === 0) {
    return { status: null, reason: null }
  }

  return target
}

function isBrowserSourceFile(filePath: string) {
  const normalized = `/${filePath.split('\\').join('/')}`

  if (IGNORED_BUILD_FILES.includes(normalized)) {
    return false
  }

  return !IGNORED_BUILD_SEGMENTS.some((segment) => normalized.includes(segment))
}

async function stageBrowserBuildFiles(buildOutputPath: string) {
  await access(buildOutputPath)

  const scanDir = await mkdtemp(join(tmpdir(), 'framework-browser-baseline-'))
  const sourceFiles = await glob(SOURCE_FILE_GLOB, {
    cwd: buildOutputPath,
    absolute: false,
  }).catch(() => [])
  const browserSourceFiles = sourceFiles.filter(isBrowserSourceFile)

  for (const file of browserSourceFiles) {
    const outputPath = join(scanDir, file)
    await mkdir(dirname(outputPath), { recursive: true })
    await copyFile(join(buildOutputPath, file), outputPath)
  }

  return {
    scanDir,
    copiedFileCount: browserSourceFiles.length,
  }
}

async function main() {
  const { packageName } = parseArgs(
    'Usage: run-browser-baseline-scan <package-name>\nExample: run-browser-baseline-scan starter-astro',
  )

  const { testConfig } = await getFrameworkByPackage(packageName)
  const buildOutputPath = join(
    packagesDir,
    packageName,
    testConfig.buildOutputDir,
  )
  const { scanDir, copiedFileCount } =
    await stageBrowserBuildFiles(buildOutputPath)

  try {
    console.info(
      `Scanning browser baseline features in ${packageName} build output...\n`,
    )
    console.info(`  Build output: ${buildOutputPath}`)
    console.info(`  Staged ${copiedFileCount} browser source file(s).`)

    const [featuresByFile, detectedTarget, detectedBaselineYear] =
      await Promise.all([
        detectFeatures({ cwd: scanDir }),
        detectBaselineTarget({ cwd: scanDir }),
        detectBaselineYear({ cwd: scanDir }),
      ])

    const featureIds = [
      ...new Set([...featuresByFile.values()].flatMap((ids) => [...ids])),
    ].sort()
    const target = normalizeBaselineTarget(featureIds, detectedTarget)

    const stats: BrowserBaselineStats = {
      baselineStatus: target.status,
      baselineYear: featureIds.length === 0 ? null : detectedBaselineYear,
      baselineReason: target.reason,
      baselineFeatureCount: featureIds.length,
    }

    const label =
      target.status === null
        ? 'none'
        : target.status === false
          ? 'limited'
          : target.status
    console.info(`  Detected ${featureIds.length} web platform feature(s).`)
    console.info(
      `  Baseline target: ${label}${target.reason ? ` (${target.reason})` : ''}`,
    )

    const outputPath = join(
      packagesDir,
      packageName,
      'browser-baseline-stats.json',
    )
    writeJsonFile(outputPath, stats)

    console.info(`\n✓ Saved browser baseline stats to ${outputPath}`)
  } finally {
    await rm(scanDir, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error('Browser baseline scan failed:', error)
  process.exit(1)
})
