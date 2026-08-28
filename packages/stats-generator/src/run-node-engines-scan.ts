import { lstatSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { packagesDir } from './constants.ts'
import { getFrameworkByPackage, parseArgs, writeJsonFile } from './utils.ts'
import { resolveMinimumNodeVersion } from './node-engines.ts'
import type { NodeEngineEntry } from './node-engines.ts'

interface Manifest {
  name?: unknown
  version?: unknown
  engines?: { node?: unknown }
}

function isRealDirectory(path: string): boolean {
  try {
    return lstatSync(path).isDirectory()
  } catch {
    return false
  }
}

function readDirNames(path: string): string[] {
  try {
    return readdirSync(path)
  } catch {
    return []
  }
}

function readManifest(dir: string): Manifest | null {
  try {
    return JSON.parse(
      readFileSync(join(dir, 'package.json'), 'utf-8'),
    ) as Manifest
  } catch {
    return null
  }
}

function engineRange(manifest: Manifest | null): string | undefined {
  const node = manifest?.engines?.node
  return typeof node === 'string' ? node : undefined
}

function collectPackageDirs(nodeModulesDir: string): string[] {
  const dirs: string[] = []

  for (const name of readDirNames(nodeModulesDir)) {
    const path = join(nodeModulesDir, name)
    // Entries here are symlinks to other packages' real locations, so following
    // them would count the same installed package once per dependent.
    if (!isRealDirectory(path)) {
      continue
    }

    if (name.startsWith('@')) {
      for (const scopedName of readDirNames(path)) {
        const scopedPath = join(path, scopedName)
        if (isRealDirectory(scopedPath)) {
          dirs.push(scopedPath)
        }
      }
      continue
    }

    dirs.push(path)
  }

  return dirs
}

function collectPnpmPackageDirs(pnpmDir: string): string[] {
  const dirs: string[] = []

  for (const entry of readDirNames(pnpmDir)) {
    const nested = join(pnpmDir, entry, 'node_modules')
    if (isRealDirectory(nested)) {
      dirs.push(...collectPackageDirs(nested))
    }
  }

  return dirs
}

function collectNestedPackageDirs(nodeModulesDir: string): string[] {
  const dirs: string[] = []

  for (const dir of collectPackageDirs(nodeModulesDir)) {
    dirs.push(dir)
    const nested = join(dir, 'node_modules')
    if (isRealDirectory(nested)) {
      dirs.push(...collectNestedPackageDirs(nested))
    }
  }

  return dirs
}

async function main() {
  const { packageName } = parseArgs(
    'Usage: run-node-engines-scan <package-name>\nExample: run-node-engines-scan starter-next-js',
  )

  const { framework } = await getFrameworkByPackage(packageName)

  console.info(
    `Scanning installed dependencies for engines.node in ${framework.displayName} (${packageName})...\n`,
  )

  const starterDir = join(packagesDir, packageName)
  const nodeModulesDir = join(starterDir, 'node_modules')
  const pnpmDir = join(nodeModulesDir, '.pnpm')

  const packageDirs = isRealDirectory(pnpmDir)
    ? collectPnpmPackageDirs(pnpmDir)
    : collectNestedPackageDirs(nodeModulesDir)

  const entries: NodeEngineEntry[] = []
  const seen = new Set<string>()

  for (const dir of packageDirs) {
    const manifest = readManifest(dir)
    if (!manifest) {
      continue
    }

    const name = typeof manifest.name === 'string' ? manifest.name : null
    const version =
      typeof manifest.version === 'string' ? manifest.version : null

    const key = name && version ? `${name}@${version}` : dir
    if (seen.has(key)) {
      continue
    }
    seen.add(key)

    entries.push({
      name: name ?? relative(packagesDir, dir),
      range: engineRange(manifest),
    })
  }

  entries.push({
    name: packageName,
    range: engineRange(readManifest(starterDir)),
  })

  const stats = resolveMinimumNodeVersion(entries)

  console.info(
    `  Scanned ${stats.packagesScanned} package(s), ${stats.packagesDeclaringNodeEngine} declaring engines.node`,
  )

  if (stats.minimumNodeVersion) {
    console.info(`  Minimum Node version: ${stats.minimumNodeVersion}`)
    if (stats.imposedBy.length > 0) {
      console.info(`  Imposed by: ${stats.imposedBy.join(', ')}`)
    } else {
      console.info('  No single package imposes the floor; it is joint.')
    }
  } else {
    console.info('  Could not resolve a minimum Node version.')
    if (stats.unsatisfiableRanges.length > 0) {
      console.info(
        `  Unsatisfiable ranges: ${stats.unsatisfiableRanges.join(', ')}`,
      )
    }
  }

  const outputPath = join(packagesDir, packageName, 'node-engines-stats.json')
  writeJsonFile(outputPath, stats)

  console.info(`\n✓ Saved Node engines stats to ${outputPath}`)
}

main().catch((error) => {
  console.error('Node engines scan failed:', error)
  process.exit(1)
})
