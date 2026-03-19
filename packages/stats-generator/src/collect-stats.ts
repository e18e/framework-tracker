import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getFrameworks } from './get-frameworks.ts'
import { packagesDir } from './constants.ts'
import { readJsonFile } from './utils.ts'
import { saveStats } from './save-stats.ts'
import { getCIStats } from './get-ci-stats.ts'
import type {
  FrameworkStats,
  PackageJson,
  FrameworkConfig,
  CoreJsStats,
} from './types.ts'

async function getDependencyCountsFromPackageJson(pkgDir: string) {
  const packageJsonPath = join(packagesDir, pkgDir, 'package.json')
  const content = await readFile(packageJsonPath, 'utf-8')
  const packageJson = JSON.parse(content) as PackageJson

  return {
    prodDependencies: Object.keys(packageJson.dependencies ?? {}).length,
    devDependencies: Object.keys(packageJson.devDependencies ?? {}).length,
  }
}

async function processStarter(framework: FrameworkConfig, order: number) {
  const starter = framework.starter
  if (!starter) return

  const { package: pkgDir, measurements } = starter
  const { displayName } = framework

  const ciStats = (await getCIStats(pkgDir)) ?? {}

  const hasDependencies = measurements.some((m) => m.type === 'dependencies')
  const dependencyStats =
    hasDependencies && ciStats.prodDependencies === undefined
      ? await getDependencyCountsFromPackageJson(pkgDir)
      : {}

  const coreJsStats = readJsonFile<CoreJsStats>(
    join(packagesDir, pkgDir, 'corejs-stats.json'),
  )
  const coreJsFields = coreJsStats
    ? {
        vendoredCoreJsSize: coreJsStats.totalVendoredBytes,
        vendoredCoreJsUnnecessaryModules: coreJsStats.unnecessaryModules,
      }
    : {}

  const stats: FrameworkStats = {
    name: displayName,
    package: pkgDir,
    type: 'starter-kit',
    isFocused: framework.focusedFramework,
    order,
    ...dependencyStats,
    ...ciStats,
    ...coreJsFields,
  }

  await saveStats(pkgDir, stats, 'devtime')
  console.info(`✓ Collected ${displayName} (${pkgDir}) → devtime`)
}

async function processApp(framework: FrameworkConfig, order: number) {
  const app = framework.app
  if (!app) return

  const { package: pkgDir } = app
  const { displayName } = framework

  const ciStats = (await getCIStats(pkgDir)) ?? {}

  const stats: FrameworkStats = {
    name: displayName,
    package: pkgDir,
    type: 'ssr-app',
    isFocused: framework.focusedFramework,
    order,
    ...ciStats,
  }

  await saveStats(pkgDir, stats, 'runtime')
  console.info(`✓ Collected ${displayName} (${pkgDir}) → runtime`)
}

async function collectStats() {
  const frameworks = await getFrameworks()

  console.info('Collecting starter stats...\n')
  for (let i = 0; i < frameworks.length; i++) {
    const framework = frameworks[i]
    if (!framework.starter) continue
    try {
      await processStarter(framework, i)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      console.error(
        `✗ Error collecting ${framework.displayName} starter:`,
        errorMessage,
      )
    }
  }

  console.info('\nCollecting app stats...\n')
  for (let i = 0; i < frameworks.length; i++) {
    const framework = frameworks[i]
    if (!framework.app) continue
    try {
      await processApp(framework, i)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      console.error(
        `✗ Error collecting ${framework.displayName} app:`,
        errorMessage,
      )
    }
  }

  console.info('\nDone!')
}

collectStats().catch(console.error)
