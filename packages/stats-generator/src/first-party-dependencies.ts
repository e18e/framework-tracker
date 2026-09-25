import { join } from 'node:path'
import { parse } from 'yaml'
import { packagesDir } from './constants.ts'
import { getPackageJsonDeps, readJsonFile } from './utils.ts'
import type { FirstPartyDependencyStats, PackageJson } from './types.ts'

type DependencySection = 'dependencies' | 'devDependencies'

const DEPENDENCY_SECTIONS: DependencySection[] = [
  'dependencies',
  'devDependencies',
]

function isDependencyMap(value: unknown): value is Record<string, string> {
  return (
    value != null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.values(value).every((version) => typeof version === 'string')
  )
}

/**
 * Checks that a first-party dependency manifest is an exact subset of the
 * starter's direct dependency sections, including the pinned versions.
 */
export function validateFirstPartyDependencyManifest(
  manifest: unknown,
  packageJson: PackageJson,
): string[] {
  if (
    manifest == null ||
    typeof manifest !== 'object' ||
    Array.isArray(manifest)
  ) {
    return ['must be a JSON object']
  }

  const manifestRecord = manifest as Record<string, unknown>
  const errors: string[] = []
  const unexpectedKeys = Object.keys(manifestRecord).filter(
    (key) => !DEPENDENCY_SECTIONS.includes(key as DependencySection),
  )
  if (unexpectedKeys.length > 0) {
    errors.push(
      `contains unsupported key(s): ${unexpectedKeys.sort().join(', ')}`,
    )
  }

  for (const section of DEPENDENCY_SECTIONS) {
    const dependencies = manifestRecord[section]
    if (!isDependencyMap(dependencies)) {
      errors.push(`${section} must be an object of package names and versions`)
      continue
    }

    for (const [name, version] of Object.entries(dependencies)) {
      const starterVersion = packageJson[section]?.[name]
      if (starterVersion !== version) {
        errors.push(
          `${section}.${name} is ${version}; starter has ${starterVersion ?? 'no matching entry'}`,
        )
      }
    }
  }

  return errors
}

export function getFirstPartyDependencyManifest(
  packageName: string,
): PackageJson {
  const manifestPath = join(
    packagesDir,
    packageName,
    'first-party-dependencies.json',
  )
  const manifest = readJsonFile<unknown>(manifestPath)
  const errors = validateFirstPartyDependencyManifest(
    manifest,
    getPackageJsonDeps(packageName),
  )
  if (errors.length > 0) {
    throw new Error(
      `Invalid first-party manifest for ${packageName}: ${errors.join('; ')}`,
    )
  }
  return manifest as PackageJson
}

interface LockfileDependency {
  specifier: string
  version: string
}

interface LockfileSnapshot {
  dependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
}

interface PnpmLockfile {
  importers?: Record<
    string,
    Partial<Record<DependencySection, Record<string, LockfileDependency>>>
  >
  packages?: Record<string, unknown>
  snapshots?: Record<string, LockfileSnapshot>
}

/** Count the resolved graph reachable from the selected direct dependencies. */
export function getFirstPartyDependencyStats(
  manifest: PackageJson,
  lockfileContent: string,
): FirstPartyDependencyStats {
  const lockfile = parse(lockfileContent) as PnpmLockfile
  const importer = lockfile.importers?.['.']
  const { packages, snapshots } = lockfile
  if (!importer || !packages || !snapshots) {
    throw new Error('Starter pnpm lockfile is missing its dependency graph')
  }

  const pending: string[] = []
  for (const section of DEPENDENCY_SECTIONS) {
    for (const [name, specifier] of Object.entries(manifest[section] ?? {})) {
      const resolved = importer[section]?.[name]
      if (!resolved || resolved.specifier !== specifier) {
        throw new Error(`Lockfile is out of sync for ${section}.${name}`)
      }
      pending.push(`${name}@${resolved.version}`)
    }
  }

  const visitedSnapshots = new Set<string>()
  const packageKeys = new Set<string>()
  while (pending.length > 0) {
    const snapshotKey = pending.pop()!
    if (visitedSnapshots.has(snapshotKey)) continue
    const snapshot: LockfileSnapshot | undefined = snapshots[snapshotKey]
    if (!snapshot) {
      throw new Error(`Missing lockfile snapshot: ${snapshotKey}`)
    }
    visitedSnapshots.add(snapshotKey)

    // Peer contexts create separate snapshots, but the packages section has
    // one entry per package version, matching the existing full-graph count.
    const packageKey = snapshotKey.split('(')[0]
    if (!(packageKey in packages)) {
      throw new Error(`Missing lockfile package: ${packageKey}`)
    }
    packageKeys.add(packageKey)

    const dependencies: Record<string, string> = {
      ...snapshot.dependencies,
      ...snapshot.optionalDependencies,
    }
    for (const [name, version] of Object.entries(dependencies)) {
      const dependencyKey = `${name}@${version}`
      // pnpm records aliased dependencies with the real package key as their
      // version, such as `wrap-ansi-cjs: wrap-ansi@7.0.0`.
      if (dependencyKey in snapshots) {
        pending.push(dependencyKey)
      } else if (version in snapshots) {
        pending.push(version)
      } else {
        throw new Error(`Missing lockfile snapshot: ${dependencyKey}`)
      }
    }
  }

  const versionsByName = new Map<string, Set<string>>()
  for (const packageKey of packageKeys) {
    const separator = packageKey.lastIndexOf('@')
    const name = packageKey.slice(0, separator)
    const version = packageKey.slice(separator + 1)
    const versions = versionsByName.get(name) ?? new Set<string>()
    versions.add(version)
    versionsByName.set(name, versions)
  }

  return {
    prodDependencies: Object.keys(manifest.dependencies ?? {}).length,
    devDependencies: Object.keys(manifest.devDependencies ?? {}).length,
    allDependencies: packageKeys.size,
    duplicateDependencies: [...versionsByName.values()].filter(
      (versions) => versions.size > 1,
    ).length,
  }
}
