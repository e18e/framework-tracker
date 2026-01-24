import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getFrameworks } from './get-frameworks.ts'
import { packagesDir } from './constants.ts'
import { saveStats } from './save-stats.ts'
import { getCIStats } from './get-ci-stats.ts'
import type { FrameworkStats, PackageJson, FrameworkConfig } from './types.ts'

async function getDependencyCounts(pkgDir: string) {
  const packageJsonPath = join(packagesDir, pkgDir, 'package.json')
  const content = await readFile(packageJsonPath, 'utf-8')
  const packageJson = JSON.parse(content) as PackageJson

  return {
    prodDependencies: Object.keys(packageJson.dependencies ?? {}).length,
    devDependencies: Object.keys(packageJson.devDependencies ?? {}).length,
  }
}

async function processFramework(framework: FrameworkConfig) {
  const { package: pkgDir, displayName, measurements } = framework

  const dependencyStats = measurements.includes('dependencies')
    ? await getDependencyCounts(pkgDir)
    : {}

  const ciStats = (await getCIStats(pkgDir)) ?? {}

  const stats: FrameworkStats = {
    name: displayName,
    package: pkgDir,
    type: 'starter-kit',
    ...dependencyStats,
    ...ciStats,
  }

  await saveStats(pkgDir, stats)
  console.log(`✓ Processed ${displayName} (${pkgDir})`)
}

async function createStats() {
  const frameworks = await getFrameworks()

  for (const framework of frameworks) {
    try {
      await processFramework(framework)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      console.error(
        `✗ Error processing ${framework.displayName}:`,
        errorMessage,
      )
    }
  }
}

createStats().catch(console.error)
