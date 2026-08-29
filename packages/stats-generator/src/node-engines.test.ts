import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveMinimumNodeVersion } from './node-engines.ts'
import type { NodeEngineEntry } from './node-engines.ts'

function floorOf(range: string): string | null {
  return resolveMinimumNodeVersion([{ name: 'pkg', range }]).minimumNodeVersion
}

test('two ranges whose intersection starts above either floor report both as imposing', () => {
  const stats = resolveMinimumNodeVersion([
    { name: 'a', range: '^18 || >=20' },
    { name: 'b', range: '>=19' },
  ])
  assert.equal(stats.minimumNodeVersion, '20.0.0')
  assert.deepEqual(stats.imposedBy, ['a', 'b'])
  assert.deepEqual(stats.unsatisfiableRanges, [])
})

test('spelling variants of one range both impose the floor', () => {
  const stats = resolveMinimumNodeVersion([
    { name: 'a', range: '>=20' },
    { name: 'b', range: '>=20.0.0' },
    { name: 'c', range: '>= v20.x' },
  ])
  assert.equal(stats.minimumNodeVersion, '20.0.0')
  assert.deepEqual(stats.imposedBy, ['a', 'b', 'c'])
})

test('>= 0.4 floors at 0.4.0', () => {
  assert.equal(floorOf('>= 0.4'), '0.4.0')
})

test('>=0.8.x floors at 0.8.0', () => {
  assert.equal(floorOf('>=0.8.x'), '0.8.0')
})

test('>=v12.22.7 floors at 12.22.7', () => {
  assert.equal(floorOf('>=v12.22.7'), '12.22.7')
})

test('>=16 || 14 >=14.17 floors at the two-comparator branch, 14.17.0', () => {
  assert.equal(floorOf('>=16 || 14 >=14.17'), '14.17.0')
})

test('6.* || 8.* || >= 10.* floors at 6.0.0', () => {
  assert.equal(floorOf('6.* || 8.* || >= 10.*'), '6.0.0')
})

test('4.x || >=6.0.0 floors at 4.0.0', () => {
  assert.equal(floorOf('4.x || >=6.0.0'), '4.0.0')
})

test('20 || >=22 floors at 20.0.0', () => {
  assert.equal(floorOf('20 || >=22'), '20.0.0')
})

test('18.20.8 || ^20.3.0 || >=22.0.0 floors at 18.20.8', () => {
  assert.equal(floorOf('18.20.8 || ^20.3.0 || >=22.0.0'), '18.20.8')
})

test('^18.18.0 || ^20.9.0 || >=21.1.0 floors at 18.18.0', () => {
  assert.equal(floorOf('^18.18.0 || ^20.9.0 || >=21.1.0'), '18.18.0')
})

test('a mixed tree intersects to 20.9.0 imposed by the two ranges that exclude 18.18.0 and 20.0.0', () => {
  const entries: NodeEngineEntry[] = [
    { name: 'alpha', range: '>= 0.4' },
    { name: 'bravo', range: '>=16 || 14 >=14.17' },
    { name: 'charlie', range: '6.* || 8.* || >= 10.*' },
    { name: 'delta', range: '4.x || >=6.0.0' },
    { name: 'echo', range: '20 || >=22' },
    { name: 'foxtrot', range: '^18.18.0 || ^20.9.0 || >=21.1.0' },
    { name: 'golf' },
  ]
  const stats = resolveMinimumNodeVersion(entries)
  assert.equal(stats.minimumNodeVersion, '20.9.0')
  assert.deepEqual(stats.imposedBy, ['echo', 'foxtrot'])
  assert.deepEqual(stats.unsatisfiableRanges, [])
  assert.equal(stats.packagesScanned, 7)
  assert.equal(stats.packagesDeclaringNodeEngine, 6)
})

test('universal, garbage, blank, and missing ranges are skipped but counted', () => {
  const stats = resolveMinimumNodeVersion([
    { name: 'star', range: '*' },
    { name: 'zero', range: '>=0.0.0' },
    { name: 'garbage', range: 'not-a-range' },
    { name: 'blank', range: '   ' },
    { name: 'missing' },
    { name: 'real', range: '>=18' },
  ])
  assert.equal(stats.minimumNodeVersion, '18.0.0')
  assert.deepEqual(stats.imposedBy, ['real'])
  assert.equal(stats.packagesScanned, 6)
  assert.equal(stats.packagesDeclaringNodeEngine, 4)
})

test('empty input resolves to nothing', () => {
  assert.deepEqual(resolveMinimumNodeVersion([]), {
    minimumNodeVersion: null,
    imposedBy: [],
    packagesScanned: 0,
    packagesDeclaringNodeEngine: 0,
    unsatisfiableRanges: [],
  })
})

test('disjoint ranges yield null and list every range a candidate failed', () => {
  const stats = resolveMinimumNodeVersion([
    { name: 'a', range: '^18.0.0' },
    { name: 'b', range: '>=20' },
  ])
  assert.equal(stats.minimumNodeVersion, null)
  assert.deepEqual(stats.imposedBy, [])
  assert.deepEqual(stats.unsatisfiableRanges, [
    '>=18.0.0 <19.0.0-0',
    '>=20.0.0',
  ])
})

test('the starter package itself can be the sole imposer', () => {
  const stats = resolveMinimumNodeVersion([
    { name: 'starter-mastro', range: '>=24.12' },
    { name: 'a', range: '>=18' },
    { name: 'b', range: '^20 || >=22' },
  ])
  assert.equal(stats.minimumNodeVersion, '24.12.0')
  assert.deepEqual(stats.imposedBy, ['starter-mastro'])
})
