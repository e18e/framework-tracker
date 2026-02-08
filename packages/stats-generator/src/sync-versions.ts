import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getFrameworks } from './get-frameworks.ts'
import { packagesDir } from './constants.ts'

interface VersionMismatch {
  frameworkPackage: string
  displayName: string
  starterPackage: string
  starterVersion: string
  starterIsDevDep: boolean
  appPackage: string
  appVersion: string
  appIsDevDep: boolean
}

/**
 * Strips leading range prefixes (^, ~, >=, <) from a version string
 * so that e.g. "^5.16.15" and "5.16.15" compare equal.
 * Does not handle compound ranges (e.g. ">=1.0.0 <2.0.0").
 */
function normalizeVersion(version: string): string {
  return version.replace(/^[\^~>=<]+/, '')
}

function extractVersion(
  packageJson: Record<string, unknown>,
  frameworkPackage: string,
): { version: string; isDevDep: boolean } | null {
  const deps = packageJson.dependencies as Record<string, string> | undefined
  const devDeps = packageJson.devDependencies as
    | Record<string, string>
    | undefined

  if (deps?.[frameworkPackage]) {
    return { version: deps[frameworkPackage], isDevDep: false }
  }
  if (devDeps?.[frameworkPackage]) {
    return { version: devDeps[frameworkPackage], isDevDep: true }
  }
  return null
}

async function checkVersions(): Promise<VersionMismatch[]> {
  const frameworks = await getFrameworks()
  const mismatches: VersionMismatch[] = []

  const pairs = frameworks.filter((f) => f.starter && f.app)
  console.info(`Checking ${pairs.length} framework package pair(s)...\n`)

  for (const framework of pairs) {
    const { displayName, frameworkPackage } = framework
    const starterPkg = framework.starter!.package
    const appPkg = framework.app!.package

    console.info(`Checking ${displayName}...`)
    console.info(`  Starter: ${starterPkg}`)
    console.info(`  App: ${appPkg}`)
    console.info(`  Framework package: ${frameworkPackage}`)

    // Read both package.json files
    const starterPath = join(packagesDir, starterPkg, 'package.json')
    let starterPackageJson: Record<string, unknown>
    try {
      const starterContent = await readFile(starterPath, 'utf-8')
      starterPackageJson = JSON.parse(starterContent)
    } catch (error) {
      console.error(
        `Failed to read ${starterPath}:`,
        error instanceof Error ? error.message : String(error),
      )
      continue
    }

    const appPath = join(packagesDir, appPkg, 'package.json')
    let appPackageJson: Record<string, unknown>
    try {
      const appContent = await readFile(appPath, 'utf-8')
      appPackageJson = JSON.parse(appContent)
    } catch (error) {
      console.error(
        `Failed to read ${appPath}:`,
        error instanceof Error ? error.message : String(error),
      )
      continue
    }

    const starterVersionInfo = extractVersion(
      starterPackageJson,
      frameworkPackage,
    )

    if (!starterVersionInfo) {
      console.warn(
        `  ❌ Framework package "${frameworkPackage}" not found in ${starterPkg}`,
      )
      continue
    }

    const appVersionInfo = extractVersion(appPackageJson, frameworkPackage)

    if (!appVersionInfo) {
      console.warn(
        `  ❌ Framework package "${frameworkPackage}" not found in ${appPkg}`,
      )
      continue
    }

    // Compare normalized versions
    const starterNormalized = normalizeVersion(starterVersionInfo.version)
    const appNormalized = normalizeVersion(appVersionInfo.version)

    const depLocationStarter = starterVersionInfo.isDevDep
      ? 'devDependencies'
      : 'dependencies'
    const depLocationApp = appVersionInfo.isDevDep
      ? 'devDependencies'
      : 'dependencies'

    console.info(
      `  Starter version: ${starterVersionInfo.version} (${depLocationStarter})`,
    )
    console.info(`  App version: ${appVersionInfo.version} (${depLocationApp})`)

    if (starterNormalized !== appNormalized) {
      console.error(`  ❌ MISMATCH: ${starterNormalized} != ${appNormalized}`)
      mismatches.push({
        frameworkPackage,
        displayName,
        starterPackage: starterPkg,
        starterVersion: starterVersionInfo.version,
        starterIsDevDep: starterVersionInfo.isDevDep,
        appPackage: appPkg,
        appVersion: appVersionInfo.version,
        appIsDevDep: appVersionInfo.isDevDep,
      })
    } else {
      console.info(`  ✓ Versions match\n`)
    }
  }

  return mismatches
}

async function main() {
  console.info('Checking framework version synchronization...\n')

  const mismatches = await checkVersions()

  console.info('\n' + '='.repeat(60))
  if (mismatches.length === 0) {
    console.info('✓ All framework versions are synchronized!')
    console.info('='.repeat(60) + '\n')
    process.exit(0)
  }

  console.error(`✗ Found ${mismatches.length} version mismatch(es):`)
  console.error('='.repeat(60) + '\n')

  for (const mismatch of mismatches) {
    console.error(
      `  ${mismatch.displayName}: ${mismatch.starterPackage} (${mismatch.starterVersion}) != ${mismatch.appPackage} (${mismatch.appVersion})`,
    )
  }

  // Print detailed error message with actionable fixes
  console.error('\nTo fix these mismatches, update the app package versions:')
  for (const mismatch of mismatches) {
    const depKey = mismatch.appIsDevDep ? 'devDependencies' : 'dependencies'
    console.error(`\n${mismatch.displayName}:`)
    console.error(
      `  Update packages/${mismatch.appPackage}/package.json "${depKey}.${mismatch.frameworkPackage}"`,
    )
    console.error(
      `  from "${mismatch.appVersion}" to "${mismatch.starterVersion}"`,
    )
  }
  console.error('\nApply the changes above to fix the mismatches.\n')

  process.exit(1)
}

main().catch((error) => {
  console.error('Version sync check failed:', error)
  process.exit(1)
})
