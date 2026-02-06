import { execSync } from 'node:child_process'
import { cpSync, rmSync, existsSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { packagesDir } from './constants.ts'
import {
  getDirectorySize,
  writeJsonFile,
  getFrameworkByPackage,
  parseArgs,
} from './utils.ts'
import type { InstallStats } from './types.ts'

const rootDir = join(packagesDir, '..')

function execCommand(command: string, cwd: string): string {
  return execSync(command, {
    cwd,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
}

function cleanForFreshInstall(cwd: string): void {
  const nodeModulesPath = join(cwd, 'node_modules')
  if (existsSync(nodeModulesPath)) {
    rmSync(nodeModulesPath, { recursive: true, force: true })
  }

  try {
    execCommand('pnpm store prune', cwd)
  } catch {
    // Ignore if prune fails
  }
}

function measureInstallTime(cwd: string): number {
  cleanForFreshInstall(cwd)

  const start = performance.now()
  execCommand('pnpm install --no-frozen-lockfile', cwd)
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

  const fallbackFrequency = '5'
  const base = 10
  const runFrequency = parseInt(args[0] || fallbackFrequency, base)

  const framework = await getFrameworkByPackage(packageName)

  if (!framework.frameworkPackage) {
    console.error(`No frameworkPackage defined for ${packageName}`)
    process.exit(1)
  }

  console.info(
    `Running install benchmark for ${framework.displayName} (${packageName})...`,
  )
  console.info(`Run frequency: ${runFrequency}\n`)

  const sourceDir = join(packagesDir, packageName)
  const tempDir = join(
    tmpdir(),
    `framework-benchmark-${packageName}-${Date.now()}`,
  )

  console.info(`Copying ${packageName} to ${tempDir}...`)
  cpSync(sourceDir, tempDir, { recursive: true })

  const rootLockfile = join(rootDir, 'pnpm-lock.yaml')
  if (existsSync(rootLockfile)) {
    copyFileSync(rootLockfile, join(tempDir, 'pnpm-lock.yaml'))
  }

  try {
    const installTimes: number[] = []

    for (let i = 1; i <= runFrequency; i++) {
      console.info(`\nInstall run ${i}/${runFrequency}...`)
      const time = measureInstallTime(tempDir)
      installTimes.push(time)
      console.info(`  Install time: ${time}ms`)
    }

    const avgInstallTimeMs =
      Math.round(
        (installTimes.reduce((a, b) => a + b, 0) / installTimes.length) * 10,
      ) / 10
    const minInstallTimeMs = Math.min(...installTimes)
    const maxInstallTimeMs = Math.max(...installTimes)

    const frameworkVersion = getFrameworkVersion(
      tempDir,
      framework.frameworkPackage,
    )
    console.info(`\nFramework version: ${frameworkVersion}`)

    const nodeModulesPath = join(tempDir, 'node_modules')
    const nodeModulesSize = getDirectorySize(nodeModulesPath)
    console.info(`node_modules size: ${nodeModulesSize} bytes`)

    rmSync(nodeModulesPath, { recursive: true, force: true })
    execCommand('pnpm install --prod --no-frozen-lockfile', tempDir)

    const nodeModulesSizeProdOnly = getDirectorySize(nodeModulesPath)
    console.info(
      `node_modules size (prod only): ${nodeModulesSizeProdOnly} bytes`,
    )

    const stats: InstallStats = {
      frameworkVersion,
      installTime: {
        avgMs: avgInstallTimeMs,
        minMs: minInstallTimeMs,
        maxMs: maxInstallTimeMs,
      },
      nodeModulesSize,
      nodeModulesSizeProdOnly,
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
