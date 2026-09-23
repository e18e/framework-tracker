import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  getFirstPartyDependencyManifest,
  getFirstPartyDependencyStats,
} from './first-party-dependencies.ts'
import { packagesDir } from './constants.ts'
import { parseArgs, writeJsonFile } from './utils.ts'

async function main() {
  const { packageName, args } = parseArgs(
    'Usage: run-first-party-dependency-scan <starter-package> [output-path]',
  )
  const [requestedOutputPath] = args
  const manifest = getFirstPartyDependencyManifest(packageName)
  const outputPath =
    requestedOutputPath ??
    join(packagesDir, packageName, 'first-party-dependency-stats.json')
  const lockfile = await readFile(
    join(packagesDir, packageName, 'pnpm-lock.yaml'),
    'utf-8',
  )
  const stats = getFirstPartyDependencyStats(manifest, lockfile)
  writeJsonFile(outputPath, stats)
  console.info(`Saved first-party dependency stats to ${outputPath}`)
}

main().catch((error) => {
  console.error('First-party dependency scan failed:', error)
  process.exit(1)
})
