import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getFrameworks } from './get-frameworks.ts'
import { packagesDir } from './constants.ts'

interface VersionUpdate {
  displayName: string
  frameworkPackage: string
  oldVersion: string
  newVersion: string
}

interface BumpOutput {
  title: string
  body: string
  updates: VersionUpdate[]
}

function buildPrTitle(updates: VersionUpdate[]): string {
  const parts = updates.map(
    (u) => `${u.displayName} ${u.oldVersion} \u2192 ${u.newVersion}`,
  )
  return `Bump framework versions: ${parts.join(', ')}`
}

function buildPrBody(updates: VersionUpdate[]): string {
  let body = '## Version Updates\n\n'
  body += '| Framework | Package | Old Version | New Version |\n'
  body += '|-----------|---------|-------------|-------------|\n'
  for (const u of updates) {
    body += `| ${u.displayName} | \`${u.frameworkPackage}\` | ${u.oldVersion} | ${u.newVersion} |\n`
  }

  body += '\n## Reviewer Checklist\n\n'
  body +=
    "Before merging, please verify each updated framework's starter against the official CLI output:\n\n"

  for (const u of updates) {
    body += `- [ ] **${u.displayName}**: Check the official docs for the latest CLI command and compare against \`packages/starter-*\` for config/dependency/initial-file drift\n`
  }

  body += '\n---\n'
  body += 'This PR was automatically created by the bump-versions workflow.\n'

  return body
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

function getPrefix(version: string): string {
  const match = version.match(/^[\^~>=<]+/)
  return match ? match[0] : ''
}

function stripPrefix(version: string): string {
  return version.replace(/^[\^~>=<]+/, '')
}

function isMinorOrMajorBump(oldVersion: string, newVersion: string): boolean {
  const [oldMajor, oldMinor] = oldVersion.split('.').map(Number)
  const [newMajor, newMinor] = newVersion.split('.').map(Number)
  return newMajor > oldMajor || newMinor > oldMinor
}

async function fetchLatestVersion(packageName: string): Promise<string> {
  const url = `https://registry.npmjs.org/${packageName}/latest`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
    )
  }
  const data = (await response.json()) as { version: string }
  return data.version
}

function setVersion(
  packageJson: Record<string, unknown>,
  frameworkPackage: string,
  newVersion: string,
  isDevDep: boolean,
): void {
  const depKey = isDevDep ? 'devDependencies' : 'dependencies'
  const deps = packageJson[depKey] as Record<string, string>
  deps[frameworkPackage] = newVersion
}

async function bumpVersions(): Promise<VersionUpdate[]> {
  const frameworks = await getFrameworks()
  const updates: VersionUpdate[] = []

  const pairs = frameworks.filter((f) => f.starter && f.app)
  console.info(`Checking ${pairs.length} framework(s) for updates...\n`)

  for (const framework of pairs) {
    const { displayName, frameworkPackage } = framework
    const starterPkg = framework.starter!.package
    const appPkg = framework.app!.package

    const starterPath = join(packagesDir, starterPkg, 'package.json')
    const appPath = join(packagesDir, appPkg, 'package.json')

    let starterPackageJson: Record<string, unknown>
    try {
      starterPackageJson = JSON.parse(await readFile(starterPath, 'utf-8'))
    } catch {
      console.warn(`  Skipping ${displayName}: could not read ${starterPath}`)
      continue
    }

    let appPackageJson: Record<string, unknown>
    try {
      appPackageJson = JSON.parse(await readFile(appPath, 'utf-8'))
    } catch {
      console.warn(`  Skipping ${displayName}: could not read ${appPath}`)
      continue
    }

    const starterInfo = extractVersion(starterPackageJson, frameworkPackage)
    if (!starterInfo) {
      console.warn(
        `  Skipping ${displayName}: ${frameworkPackage} not found in starter`,
      )
      continue
    }

    const appInfo = extractVersion(appPackageJson, frameworkPackage)
    if (!appInfo) {
      console.warn(
        `  Skipping ${displayName}: ${frameworkPackage} not found in app`,
      )
      continue
    }

    const currentVersion = stripPrefix(starterInfo.version)
    const prefix = getPrefix(starterInfo.version)

    let latestVersion: string
    try {
      latestVersion = await fetchLatestVersion(frameworkPackage)
    } catch (error) {
      console.warn(
        `  Skipping ${displayName}: failed to fetch latest version -`,
        error instanceof Error ? error.message : String(error),
      )
      continue
    }

    console.info(
      `${displayName}: current ${currentVersion}, latest ${latestVersion}`,
    )

    if (currentVersion === latestVersion) {
      console.info(`  Already up to date\n`)
      continue
    }

    if (!isMinorOrMajorBump(currentVersion, latestVersion)) {
      console.info(
        `  Skipping patch-only bump (${currentVersion} -> ${latestVersion})\n`,
      )
      continue
    }

    const newVersionWithPrefix = `${prefix}${latestVersion}`

    // Update starter package.json
    setVersion(
      starterPackageJson,
      frameworkPackage,
      newVersionWithPrefix,
      starterInfo.isDevDep,
    )
    await writeFile(
      starterPath,
      JSON.stringify(starterPackageJson, null, 2) + '\n',
    )

    // Update app package.json with same prefix as app had
    const appPrefix = getPrefix(appInfo.version)
    setVersion(
      appPackageJson,
      frameworkPackage,
      `${appPrefix}${latestVersion}`,
      appInfo.isDevDep,
    )
    await writeFile(appPath, JSON.stringify(appPackageJson, null, 2) + '\n')

    console.info(
      `  Updated: ${starterInfo.version} -> ${newVersionWithPrefix}\n`,
    )

    updates.push({
      displayName,
      frameworkPackage,
      oldVersion: currentVersion,
      newVersion: latestVersion,
    })
  }

  return updates
}

async function main() {
  const outputPath = process.argv[2]
  if (!outputPath) {
    console.error('Usage: bump-versions <output-path>')
    process.exit(1)
  }

  const updates = await bumpVersions()

  if (updates.length === 0) {
    console.info('\nNo updates found.')
    process.exit(1)
  }

  console.info(`\n${updates.length} framework(s) updated.`)

  const output: BumpOutput = {
    title: buildPrTitle(updates),
    body: buildPrBody(updates),
    updates,
  }

  await writeFile(outputPath, JSON.stringify(output, null, 2) + '\n')
  console.info(`Output written to ${outputPath}`)
  process.exit(0)
}

main().catch((error) => {
  console.error('Version bump failed:', error)
  process.exit(1)
})
