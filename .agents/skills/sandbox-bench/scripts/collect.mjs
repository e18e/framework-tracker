#!/usr/bin/env node

import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import { loadConfig, sandboxScope } from './config.mjs'

const execFileP = promisify(execFile)

function usage() {
  console.error('Usage: node collect.mjs <run-directory> [--keep]')
}

async function main() {
  const runDir = process.argv[2]
  const keep = process.argv.includes('--keep')
  if (!runDir || runDir.startsWith('-')) {
    usage()
    process.exit(1)
  }

  const metaPath = path.join(runDir, 'meta.json')
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
  const config = loadConfig()
  const scope = sandboxScope(config)
  const sandbox = async (args) => {
    const scoped = ['sandbox', ...args]
    const separator = scoped.indexOf('--')
    scoped.splice(separator < 0 ? scoped.length : separator, 0, ...scope)
    const { stdout, stderr } = await execFileP(config.vercelBin, scoped, {
      maxBuffer: 64 * 1024 * 1024,
    })
    return `${stdout}\n${stderr}`
  }
  const save = () =>
    fs.writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`)
  let pending = 0
  let failures = 0

  for (const [index, state] of Object.entries(meta.vms)) {
    if (state.phase === 'done') continue
    let done
    try {
      const output = await sandbox([
        'exec',
        state.vm,
        '--timeout',
        '2m',
        '--',
        'bash',
        '-c',
        'cat /vercel/sandbox/bench.done 2>/dev/null || echo no',
      ])
      done = output.match(/(?:^|\n)(no|\d+)(?:\n|$)/)?.[1]
    } catch (error) {
      console.error(`${state.vm}: could not read status: ${error.message}`)
      failures += 1
      continue
    }
    if (done === 'no' || done === undefined) {
      console.log(`${state.vm}: still running`)
      pending += 1
      continue
    }

    const archive = path.join(runDir, `vm-${index}.tgz`)
    const directory = path.join(runDir, `vm-${index}`)
    try {
      await sandbox([
        'cp',
        `${state.vm}:/vercel/sandbox/bench-results.tgz`,
        archive,
      ])
      fs.mkdirSync(directory, { recursive: true })
      await execFileP('tar', ['-xzf', archive, '-C', directory])
      const exitCode = Number(
        fs.readFileSync(path.join(directory, 'bench.exit'), 'utf8').trim(),
      )
      state.phase = exitCode === 0 ? 'done' : 'failed'
      state.exitCode = exitCode
      state.updatedAt = new Date().toISOString()
      save()
      console.log(`${state.vm}: collected (exit ${exitCode})`)
      if (exitCode !== 0) failures += 1
      if (!keep) {
        await sandbox(['rm', state.vm])
      }
    } catch (error) {
      console.error(`${state.vm}: collection failed: ${error.message}`)
      failures += 1
    }
  }

  const states = Object.values(meta.vms)
  if (
    pending === 0 &&
    failures === 0 &&
    states.length > 0 &&
    states.every((state) => state.phase === 'done')
  ) {
    meta.phase = 'complete'
    save()
    const summary = await execFileP(
      process.execPath,
      [new URL('./summarize.mjs', import.meta.url).pathname, runDir],
      { maxBuffer: 64 * 1024 * 1024 },
    )
    process.stdout.write(summary.stdout)
    process.stderr.write(summary.stderr)
  } else if (failures > 0) {
    meta.phase = 'failed'
    save()
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
