import { execSync } from 'node:child_process'
import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { basename, join } from 'node:path'
import { tmpdir } from 'node:os'
import { installDependencies, parseRunFrequency } from './benchmark-utils.ts'
import { packagesDir } from './constants.ts'
import {
  getDirectorySize,
  writeJsonFile,
  getFrameworkByPackage,
  parseArgs,
} from './utils.ts'
import type { InstallStats } from './types.ts'

function execCommand(command: string, cwd: string): string {
  return execSync(command, {
    cwd,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
}

function copyFreshProject(sourceDir: string, runDir: string): string {
  const projectDir = join(runDir, 'project')
  mkdirSync(runDir, { recursive: true })
  cpSync(sourceDir, projectDir, {
    recursive: true,
    filter: (sourcePath) => basename(sourcePath) !== 'node_modules',
  })
  return projectDir
}

function measureInstallTime(
  cwd: string,
  storeDir: string,
  cacheDir: string,
): number {
  const start = performance.now()
  installDependencies(cwd, storeDir, cacheDir)
  const end = performance.now()

  return Math.round(end - start)
}

function getFrameworkVersion(cwd: string, frameworkPackage: string): string {
  try {
    const output = execCommand(
      `pnpm list "${frameworkPackage}" --depth=0 --json`,
      cwd,
    )
    const data = JSON.parse(output)
    return (
      data[0]?.dependencies?.[frameworkPackage]?.version ||
      data[0]?.devDependencies?.[frameworkPackage]?.version ||
      'unknown'
    )
  } catch {
    return 'unknown'
  }
}

async function main() {
  const { packageName, args } = parseArgs(
    'Usage: run-install-benchmark <package-name> [run-frequency]\nExample: run-install-benchmark starter-astro 5',
  )

  const runFrequency = parseRunFrequency(args[0])

  const { framework } = await getFrameworkByPackage(packageName)

  console.info(
    `Running install benchmark for ${framework.displayName} (${packageName})...`,
  )
  console.info(`Run frequency: ${runFrequency}\n`)

  const sourceDir = join(packagesDir, packageName)
  const tempDir = join(
    tmpdir(),
    `framework-benchmark-${packageName}-${Date.now()}`,
  )

  console.info(`Using isolated benchmark directory ${tempDir}...`)

  try {
    const installTimes: number[] = []
    let finalProjectDir = ''
    let previousRunDir = ''

    for (let i = 1; i <= runFrequency; i++) {
      if (previousRunDir) {
        rmSync(previousRunDir, { recursive: true, force: true })
      }

      const runDir = join(tempDir, `run-${i}`)
      const projectDir = copyFreshProject(sourceDir, runDir)
      const storeDir = join(runDir, 'store')
      const cacheDir = join(runDir, 'cache')

      console.info(`\nInstall run ${i}/${runFrequency}...`)
      const time = measureInstallTime(projectDir, storeDir, cacheDir)
      installTimes.push(time)
      console.info(`  Install time: ${time}ms`)

      finalProjectDir = projectDir
      previousRunDir = runDir
    }

    const avgInstallTimeMs =
      Math.round(
        (installTimes.reduce((a, b) => a + b, 0) / installTimes.length) * 10,
      ) / 10
    const minInstallTimeMs = Math.min(...installTimes)
    const maxInstallTimeMs = Math.max(...installTimes)

    const frameworkVersion = getFrameworkVersion(
      finalProjectDir,
      framework.frameworkPackage,
    )
    console.info(`\nFramework version: ${frameworkVersion}`)

    const nodeModulesPath = join(finalProjectDir, 'node_modules')
    const nodeModulesSize = getDirectorySize(nodeModulesPath)
    console.info(`node_modules size: ${nodeModulesSize} bytes`)

    const stats: InstallStats = {
      frameworkVersion,
      installTime: {
        avgMs: avgInstallTimeMs,
        minMs: minInstallTimeMs,
        maxMs: maxInstallTimeMs,
      },
      nodeModulesSize,
    }

    const outputPath = join(packagesDir, packageName, 'install-stats.json')
    writeJsonFile(outputPath, stats)

    console.info(`\n✓ Saved install stats to ${outputPath}`)
    console.info(`  Average: ${stats.installTime.avgMs}ms`)
    console.info(`  Min: ${stats.installTime.minMs}ms`)
    console.info(`  Max: ${stats.installTime.maxMs}ms`)
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error('Install benchmark failed:', error)
  process.exit(1)
})
