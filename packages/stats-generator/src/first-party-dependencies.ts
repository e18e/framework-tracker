import type { PackageJson } from './types.ts'

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
