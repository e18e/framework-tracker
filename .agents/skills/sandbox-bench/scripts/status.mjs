#!/usr/bin/env node

import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import { loadConfig, sandboxScope } from './config.mjs'

const execFileP = promisify(execFile)

function recentRuns(cacheDir) {
  const runsDir = path.join(cacheDir, 'runs')
  if (!fs.existsSync(runsDir)) return []
  return fs
    .readdirSync(runsDir)
    .map((name) => path.join(runsDir, name, 'meta.json'))
    .filter((file) => fs.existsSync(file))
    .map((file) => JSON.parse(fs.readFileSync(file, 'utf8')))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 10)
}

async function main() {
  const config = loadConfig()
  const runs = recentRuns(config.cacheDir)
  if (runs.length === 0) {
    console.log('No local runs recorded.')
  } else {
    for (const run of runs) {
      const phases = Object.values(run.vms).reduce((counts, vm) => {
        counts[vm.phase] = (counts[vm.phase] ?? 0) + 1
        return counts
      }, {})
      console.log(
        `${run.runId}  run=${run.phase ?? 'unknown'} ${Object.entries(phases)
          .map(([phase, count]) => `${phase}=${count}`)
          .join(' ')}\n  ${run.runDir}`,
      )
    }
  }

  const { stdout, stderr } = await execFileP(
    config.vercelBin,
    ['sandbox', 'list', '--limit', '50', ...sandboxScope(config)],
    { maxBuffer: 16 * 1024 * 1024 },
  )
  console.log('\nVercel sandboxes:')
  console.log(`${stdout}${stderr}`.trim())
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
