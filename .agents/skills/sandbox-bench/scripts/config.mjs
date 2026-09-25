#!/usr/bin/env node

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const CONFIG_DIR = path.join(
  os.homedir(),
  '.config',
  'framework-tracker-sandbox-bench',
)
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

function expandHome(value) {
  if (!value) return value
  return value.startsWith('~/')
    ? path.join(os.homedir(), value.slice(2))
    : value
}

export function loadConfig({ requireScope = true } = {}) {
  const saved = fs.existsSync(CONFIG_FILE)
    ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
    : {}
  const config = {
    ...saved,
    team: process.env.FRAMEWORK_TRACKER_BENCH_TEAM ?? saved.team,
    project: process.env.FRAMEWORK_TRACKER_BENCH_PROJECT ?? saved.project,
    cacheDir: expandHome(
      process.env.FRAMEWORK_TRACKER_BENCH_CACHE ??
        saved.cacheDir ??
        '~/.cache/framework-tracker-sandbox-bench',
    ),
    vercelBin:
      process.env.FRAMEWORK_TRACKER_BENCH_VERCEL_BIN ??
      saved.vercelBin ??
      'vercel',
  }

  if (requireScope && (!config.team || !config.project)) {
    throw new Error(
      'sandbox-bench is not configured: team and project are required.\n' +
        'Ask which Vercel team and project should be billed, then run:\n' +
        `  node ${path.relative(process.cwd(), new URL(import.meta.url).pathname)} ` +
        'set team=<team-slug> project=<project-name>',
    )
  }

  return config
}

export function saveConfig(patch) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true })
  const current = fs.existsSync(CONFIG_FILE)
    ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
    : {}
  const next = { ...current, ...patch }
  fs.writeFileSync(CONFIG_FILE, `${JSON.stringify(next, null, 2)}\n`)
  return next
}

export function sandboxScope(config) {
  return ['--scope', config.team, '--project', config.project]
}

function isMain() {
  if (!process.argv[1]) return false
  try {
    return (
      fs.realpathSync(process.argv[1]) ===
      fs.realpathSync(new URL(import.meta.url).pathname)
    )
  } catch {
    return false
  }
}

if (isMain()) {
  const [command, ...args] = process.argv.slice(2)

  if (command === 'show') {
    const config = loadConfig({ requireScope: false })
    console.log(JSON.stringify(config, null, 2))
    if (!config.team || !config.project) {
      console.error('\nNOT CONFIGURED: team/project missing.')
      process.exitCode = 2
    }
  } else if (command === 'set') {
    const patch = {}
    for (const argument of args) {
      const separator = argument.indexOf('=')
      if (separator < 1) {
        throw new Error(`Expected key=value, received "${argument}"`)
      }
      patch[argument.slice(0, separator)] = argument.slice(separator + 1)
    }
    console.log(JSON.stringify(saveConfig(patch), null, 2))
  } else {
    console.error('Usage: node config.mjs show | set key=value [key=value...]')
    process.exitCode = 1
  }
}
