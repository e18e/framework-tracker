import { join } from 'node:path'
import { packagesDir } from './constants.ts'
import { validateFirstPartyDependencyManifest } from './first-party-dependencies.ts'
import { getFrameworks } from './get-frameworks.ts'
import { getPackageJsonDeps, readJsonFile } from './utils.ts'

async function main() {
  const frameworks = await getFrameworks()
  const failures: string[] = []

  for (const framework of frameworks) {
    if (!framework.starter) continue

    const packageName = framework.starter.package
    const starterPath = join(packagesDir, packageName)
    const manifestPath = join(starterPath, 'first-party-dependencies.json')

    try {
      const manifest = readJsonFile<unknown>(manifestPath)
      const packageJson = getPackageJsonDeps(packageName)
      const errors = validateFirstPartyDependencyManifest(manifest, packageJson)

      if (errors.length === 0) {
        console.info(`✓ ${packageName}`)
      } else {
        failures.push(...errors.map((error) => `${packageName}: ${error}`))
      }
    } catch (error) {
      failures.push(
        `${packageName}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  if (failures.length > 0) {
    console.error('First-party dependency manifest validation failed:')
    for (const failure of failures) console.error(`  - ${failure}`)
    process.exit(1)
  }

  console.info('All first-party dependency manifests are in sync.')
}

main().catch((error) => {
  console.error('First-party dependency manifest validation failed:', error)
  process.exit(1)
})
