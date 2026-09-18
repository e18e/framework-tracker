import assert from 'node:assert/strict'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'
import { packagesDir } from './constants.ts'
import type { FrameworkStats } from './types.ts'

test('regenerating documentation preserves migrated router-link histories', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'framework-tracker-history-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const fixturePackages = join(root, 'packages')
  const generator = join(fixturePackages, 'stats-generator', 'src')
  // Run the real writer in an isolated repository so tests cannot alter stats.
  await cp(new URL('.', import.meta.url), generator, { recursive: true })
  await writeFile(join(root, 'package.json'), '{"type":"module"}')
  const { saveStats } = (await import(
    pathToFileURL(join(generator, 'save-stats.ts')).href
  )) as typeof import('./save-stats.ts')
  const docsDir = join('docs', 'src', 'content', 'runtime')
  await mkdir(join(fixturePackages, docsDir), { recursive: true })

  const histories = {
    'app-next-js': ['16.1.1'],
    'app-nuxt': ['4.2.2'],
    'app-react-router': ['7.10.1', '7.11.0', '7.12.0', '7.13.2'],
    'app-tanstack-start-react': ['1.145.3'],
  }
  for (const [pkg, versions] of Object.entries(histories)) {
    await mkdir(join(fixturePackages, pkg, 'stats'), { recursive: true })
    const current: FrameworkStats = JSON.parse(
      await readFile(join(packagesDir, docsDir, `${pkg}.json`), 'utf8'),
    )
    for (const version of versions) {
      const relativePath = join(pkg, 'stats', `${version}.json`)
      await cp(
        join(packagesDir, relativePath),
        join(fixturePackages, relativePath),
      )
    }
    await saveStats(pkg, current, 'runtime')
    for (const version of versions) {
      const relativePath = join(docsDir, 'versions', pkg, `${version}.json`)
      const expected: FrameworkStats = JSON.parse(
        await readFile(join(packagesDir, relativePath), 'utf8'),
      )
      const actual: FrameworkStats = JSON.parse(
        await readFile(join(fixturePackages, relativePath), 'utf8'),
      )
      assert.ok(expected.ssrRouterLinkLoadTests, relativePath)
      assert.deepEqual(
        actual.ssrRouterLinkLoadTests,
        expected.ssrRouterLinkLoadTests,
        `${relativePath}: preserve every router-link metric and stage`,
      )
      assert.deepEqual(
        actual.ssrLoadTests,
        expected.ssrLoadTests,
        `${relativePath}: do not reclassify router-link results as anchors`,
      )
    }
  }
})
