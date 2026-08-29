import {
  compare,
  findMinimumForRange,
  isLess,
  normalize,
  normalizeRange as normalizeSemverRange,
  rangeToComparators,
  satisfies,
} from 'verkit'
import type { NodeEnginesStats } from './types.ts'

export interface NodeEngineEntry {
  name: string
  range?: string
}

interface Solution {
  version: string | null
  unsatisfiableRanges: string[]
}

const UNIVERSAL_RANGES = new Set(['*', '>=0.0.0'])

function normalizeRange(range: string): string | null {
  const normalized = normalizeSemverRange(range, { loose: true })
  if (normalized === null || UNIVERSAL_RANGES.has(normalized)) {
    return null
  }
  return findMinimumForRange(normalized) === null ? null : normalized
}

function branchFloors(range: string): string[] {
  const floors: string[] = []
  for (const branch of rangeToComparators(range)) {
    const floor = findMinimumForRange(branch.join(' ') || '*')
    const version = floor === null ? null : normalize(floor)
    if (version !== null) {
      floors.push(version)
    }
  }
  return floors
}

function solve(ranges: string[]): Solution {
  const candidates = [...new Set(ranges.flatMap(branchFloors))].sort(compare)
  const failed = new Set<string>()
  for (const candidate of candidates) {
    const unsatisfied = ranges.filter((range) => !satisfies(candidate, range))
    if (unsatisfied.length === 0) {
      return { version: candidate, unsatisfiableRanges: [] }
    }
    for (const range of unsatisfied) {
      failed.add(range)
    }
  }
  return { version: null, unsatisfiableRanges: [...failed].sort() }
}

export function resolveMinimumNodeVersion(
  entries: NodeEngineEntry[],
): NodeEnginesStats {
  const declared = entries.flatMap(({ name, range }) => {
    const trimmed = range?.trim()
    return trimmed ? [{ name, range: trimmed }] : []
  })

  const packagesByRange = new Map<string, Set<string>>()
  for (const { name, range } of declared) {
    const normalized = normalizeRange(range)
    if (normalized === null) {
      continue
    }
    const names = packagesByRange.get(normalized) ?? new Set<string>()
    names.add(name)
    packagesByRange.set(normalized, names)
  }

  const ranges = [...packagesByRange.keys()]
  const { version, unsatisfiableRanges } = solve(ranges)

  const imposedBy = new Set<string>()
  if (version !== null) {
    for (const [range, names] of packagesByRange) {
      const reduced = solve(ranges.filter((r) => r !== range)).version
      if (reduced === null || isLess(reduced, version)) {
        for (const name of names) {
          imposedBy.add(name)
        }
      }
    }
  }

  return {
    minimumNodeVersion: version,
    imposedBy: [...imposedBy].sort(),
    packagesScanned: entries.length,
    packagesDeclaringNodeEngine: declared.length,
    unsatisfiableRanges,
  }
}
