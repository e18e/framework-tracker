import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getStarterPackages } from './get-starter-packages'
import { packagesDir } from './constants'
import { saveStats } from './save-stats'
import type { FrameworkStats, PackageJson } from './types'

async function createStats() {
  const starterPackages = await getStarterPackages()

  for (const pkgDir of starterPackages) {
    const packageJsonPath = join(packagesDir, pkgDir, 'package.json')

    try {
      const packageJsonContent = await readFile(packageJsonPath, 'utf-8')
      const packageJson = JSON.parse(packageJsonContent) as PackageJson

      const dependencies = packageJson.dependencies || {}
      const devDependencies = packageJson.devDependencies || {}

      const prodCount = Object.keys(dependencies).length
      const devCount = Object.keys(devDependencies).length

      const stats: FrameworkStats = {
        prodDependencies: prodCount,
        devDependencies: devCount,
      }

      await saveStats(pkgDir, stats)

      console.log(`✓ Processed ${pkgDir}`)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      console.error(`✗ Error processing ${pkgDir}:`, errorMessage)
    }
  }
}

createStats().catch(console.error)
