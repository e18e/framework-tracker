import assert from 'node:assert/strict'
import test from 'node:test'
import { validateFirstPartyDependencyManifest } from './first-party-dependencies.ts'

test('accepts a first-party manifest that matches direct starter dependencies', () => {
  assert.deepEqual(
    validateFirstPartyDependencyManifest(
      {
        dependencies: { framework: '1.0.0' },
        devDependencies: { 'framework-tool': '2.0.0' },
      },
      {
        dependencies: { framework: '1.0.0', thirdParty: '3.0.0' },
        devDependencies: { 'framework-tool': '2.0.0' },
      },
    ),
    [],
  )
})

test('reports entries without an exact section, key, and version match', () => {
  assert.deepEqual(
    validateFirstPartyDependencyManifest(
      {
        dependencies: {
          framework: '0.9.0',
          'framework-tool': '2.0.0',
          transitive: '1.0.0',
        },
        devDependencies: { framework: '1.0.0' },
      },
      {
        dependencies: { framework: '1.0.0' },
        devDependencies: { 'framework-tool': '2.0.0' },
      },
    ),
    [
      'dependencies.framework is 0.9.0; starter has 1.0.0',
      'dependencies.framework-tool is 2.0.0; starter has no matching entry',
      'dependencies.transitive is 1.0.0; starter has no matching entry',
      'devDependencies.framework is 1.0.0; starter has no matching entry',
    ],
  )
})

test('reports invalid manifest structure', () => {
  assert.deepEqual(validateFirstPartyDependencyManifest(null, {}), [
    'must be a JSON object',
  ])
  assert.deepEqual(
    validateFirstPartyDependencyManifest(
      {
        dependencies: [],
        metadata: {},
      },
      {},
    ),
    [
      'contains unsupported key(s): metadata',
      'dependencies must be an object of package names and versions',
      'devDependencies must be an object of package names and versions',
    ],
  )
})
