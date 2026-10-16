#!/usr/bin/env node

import crypto from 'node:crypto'
import { execFile, spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { loadConfig, sandboxScope } from './config.mjs'

const execFileP = promisify(execFile)
const SETUP_VERSION = 'framework-tracker-node24-pnpm11-chrome1'
const RESULT_FILES = ['ci-stats.json', 'install-stats.json', 'build-stats.json']
const MEASUREMENTS = new Set([
  'install',
  'build',
  'ssrRequestThroughput',
  'ssrLoad',
  'clientSideRendered',
  'serverSideRendered',
])

function usage() {
  console.log(`Run framework-tracker benchmark matrices on Vercel Sandbox.

Usage:
  node sandbox-bench.mjs <selector[@version]...> [options]

Targets:
  Framework or package selectors accepted by "pnpm benchmark".
  Append @<version> to run that framework with a temporary version.
  "stable" is normalized to the npm "latest" tag.

Options:
  -m, --measurement <types>  Comma-separated benchmark types; repeatable
  -r, --runs <count>         Override the benchmark's internal run count
      --vms <count>          Independent sandbox boots (default: 8)
      --concurrency <count>  Concurrent sandboxes (default: 5)
      --blocks <count>       Matrix repetitions inside each boot (default: 1)
      --vcpus <count>        vCPUs per sandbox (default: 8)
      --timeout <duration>   Sandbox timeout, such as 2h or 5h (default: 5h)
      --label <slug>         Human-readable run label
      --no-cache             Build a fresh setup snapshot
      --keep                 Keep measurement sandboxes after collection
      --dry-run              Print the resolved plan without creating resources
  -h, --help                 Show this help

Examples:
  node sandbox-bench.mjs next@latest next@canary \\
    -m ssrLoad,ssrRequestThroughput --vms 8
  node sandbox-bench.mjs app-next-js@canary app-tanstack-start-react \\
    -m ssrLoad,ssrRequestThroughput,clientSideRendered,serverSideRendered
  node sandbox-bench.mjs astro next nuxt -m build --vms 4 --runs 3`)
}

function optionValue(args, index, option) {
  const value = args[index + 1]
  if (!value || value.startsWith('-')) {
    throw new Error(`${option} requires a value`)
  }
  return value
}

function positiveInteger(value, option) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${option} must be a positive integer`)
  }
  return parsed
}

function splitValues(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

function parseTarget(spec, index) {
  const separator = spec.lastIndexOf('@')
  let selector = spec
  let version
  if (separator > 0) {
    selector = spec.slice(0, separator)
    version = spec.slice(separator + 1)
    if (!version) throw new Error(`Missing version in target "${spec}"`)
    if (/[\s\x00-\x1f]/.test(version)) {
      throw new Error(`Invalid framework version in target "${spec}"`)
    }
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(selector)) {
    throw new Error(`Invalid framework or package selector "${selector}"`)
  }
  if (version === 'stable') version = 'latest'
  return {
    id: `case-${index + 1}-${slug(spec)}`,
    label: spec,
    selector,
    version,
  }
}

function parseArgs(argv) {
  const options = {
    targets: [],
    measurements: [],
    runs: undefined,
    vms: 8,
    concurrency: 5,
    blocks: 1,
    vcpus: 8,
    timeout: '5h',
    label: 'matrix',
    noCache: false,
    keep: false,
    dryRun: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '-h' || argument === '--help') return null
    if (argument === '--dry-run') {
      options.dryRun = true
      continue
    }
    if (argument === '--no-cache') {
      options.noCache = true
      continue
    }
    if (argument === '--keep') {
      options.keep = true
      continue
    }
    if (
      argument === '-m' ||
      argument === '--measurement' ||
      argument === '--measurements'
    ) {
      options.measurements.push(
        ...splitValues(optionValue(argv, index, argument)),
      )
      index += 1
      continue
    }
    if (argument.startsWith('--measurement=')) {
      options.measurements.push(
        ...splitValues(argument.slice('--measurement='.length)),
      )
      continue
    }
    if (argument === '-r' || argument === '--runs') {
      options.runs = positiveInteger(
        optionValue(argv, index, argument),
        argument,
      )
      index += 1
      continue
    }
    if (
      argument === '--vms' ||
      argument === '--concurrency' ||
      argument === '--blocks' ||
      argument === '--vcpus'
    ) {
      options[argument.slice(2)] = positiveInteger(
        optionValue(argv, index, argument),
        argument,
      )
      index += 1
      continue
    }
    if (argument === '--timeout' || argument === '--label') {
      options[argument.slice(2)] = optionValue(argv, index, argument)
      index += 1
      continue
    }
    if (argument.startsWith('-')) {
      throw new Error(`Unknown option: ${argument}`)
    }
    options.targets.push(argument)
  }

  if (options.targets.length === 0) {
    throw new Error('Provide at least one framework or package selector')
  }
  for (const measurement of options.measurements) {
    if (!MEASUREMENTS.has(measurement)) {
      throw new Error(
        `Unknown measurement "${measurement}". Expected: ${[...MEASUREMENTS].join(', ')}`,
      )
    }
  }
  if (!/^\d+(m|h)$/.test(options.timeout)) {
    throw new Error(
      '--timeout must use minutes or hours, for example 45m or 5h',
    )
  }

  options.measurements = [...new Set(options.measurements)]
  options.cases = options.targets.map(parseTarget)
  options.label = slug(options.label) || 'matrix'
  return options
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`
}

function timeoutMs(value) {
  const count = Number(value.slice(0, -1))
  return count * (value.endsWith('h') ? 60 * 60_000 : 60_000)
}

async function repoRoot() {
  const { stdout } = await execFileP('git', ['rev-parse', '--show-toplevel'], {
    maxBuffer: 1024 * 1024,
  })
  const root = stdout.trim()
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
  )
  if (packageJson.name !== 'framework-tracker') {
    throw new Error(`Expected the framework-tracker repository, found ${root}`)
  }
  return root
}

async function createSourceArchive(root, tempDir) {
  const { stdout } = await execFileP(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    { cwd: root, encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 },
  )
  const files = stdout
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .filter((file) => fs.existsSync(path.join(root, file)))
    .sort()
  if (files.length === 0) throw new Error('No repository files to upload')

  const listPath = path.join(tempDir, 'source-files')
  const archivePath = path.join(tempDir, 'framework-tracker.tgz')
  const fingerprint = crypto.createHash('sha256')
  for (const file of files) {
    const absolutePath = path.join(root, file)
    const stat = fs.lstatSync(absolutePath)
    fingerprint.update(`${file}\0${stat.mode}\0`)
    fingerprint.update(
      stat.isSymbolicLink()
        ? fs.readlinkSync(absolutePath)
        : fs.readFileSync(absolutePath),
    )
    fingerprint.update('\0')
  }
  fs.writeFileSync(listPath, `${files.join('\0')}\0`)
  await execFileP(
    'tar',
    ['--no-xattrs', '-czf', archivePath, '--null', '-T', listPath],
    {
      cwd: root,
      env: { ...process.env, COPYFILE_DISABLE: '1' },
      maxBuffer: 64 * 1024 * 1024,
    },
  )
  const hash = fingerprint.digest('hex').slice(0, 20)
  return { archivePath, hash, files: files.length }
}

function makeSandboxClient(config) {
  const scope = sandboxScope(config)

  async function sandbox(args, options = {}) {
    const scoped = ['sandbox', ...args]
    const separator = scoped.indexOf('--')
    scoped.splice(separator < 0 ? scoped.length : separator, 0, ...scope)
    const { stdout, stderr } = await execFileP(config.vercelBin, scoped, {
      maxBuffer: 64 * 1024 * 1024,
      ...options,
    })
    return `${stdout}\n${stderr}`
  }

  function streamExec(vm, duration, script, tag) {
    return new Promise((resolve, reject) => {
      const child = spawn(
        config.vercelBin,
        [
          'sandbox',
          'exec',
          vm,
          ...scope,
          '--timeout',
          duration,
          '--',
          'bash',
          '-c',
          script,
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      )
      let output = ''
      for (const [stream, marker] of [
        [child.stdout, ''],
        [child.stderr, '!'],
      ]) {
        stream.on('data', (chunk) => {
          output += chunk
          process.stderr.write(
            String(chunk)
              .split('\n')
              .filter(Boolean)
              .map((line) => `[${tag}${marker}] ${line}\n`)
              .join(''),
          )
        })
      }
      child.on('error', reject)
      child.on('exit', (code) => {
        if (code === 0) resolve(output)
        else reject(new Error(`${tag} exited ${code}\n${output.slice(-2000)}`))
      })
    })
  }

  async function remove(vm) {
    try {
      await sandbox(['rm', vm])
    } catch (error) {
      console.error(`warning: could not remove ${vm}: ${error.message}`)
    }
  }

  return { sandbox, streamExec, remove }
}

async function cachedSnapshot(client, config, key) {
  const cacheFile = path.join(config.cacheDir, 'snapshots', key)
  if (!fs.existsSync(cacheFile)) return undefined
  const snapshot = fs.readFileSync(cacheFile, 'utf8').trim()
  if (!snapshot) return undefined
  try {
    const output = await client.sandbox(['snapshots', 'list', '--limit', '50'])
    return output.includes(snapshot) ? snapshot : undefined
  } catch {
    return undefined
  }
}

function saveSnapshot(config, key, snapshot) {
  const directory = path.join(config.cacheDir, 'snapshots')
  fs.mkdirSync(directory, { recursive: true })
  fs.writeFileSync(path.join(directory, key), `${snapshot}\n`)
}

async function prepareSnapshot(client, config, options, source, needsChrome) {
  const key = crypto
    .createHash('sha256')
    .update(`${SETUP_VERSION}:${source.hash}:chrome=${needsChrome}`)
    .digest('hex')
    .slice(0, 24)
  if (!options.noCache) {
    const cached = await cachedSnapshot(client, config, key)
    if (cached) {
      console.error(`reusing setup snapshot ${cached}`)
      return cached
    }
  }

  const vm = `ftrack-setup-${Date.now().toString(36)}`
  console.error(`creating setup sandbox ${vm}`)
  await client.sandbox([
    'create',
    '--name',
    vm,
    '--runtime',
    'node24',
    '--vcpus',
    String(options.vcpus),
    '--timeout',
    '45m',
    '--non-persistent',
    '--network-policy',
    'allow-all',
    '--tag',
    'purpose=framework-tracker-bench',
    '--silent',
  ])

  try {
    await client.sandbox([
      'cp',
      source.archivePath,
      `${vm}:/vercel/sandbox/framework-tracker.tgz`,
    ])
    if (needsChrome) {
      console.error('installing Google Chrome for browser measurements')
      await client.sandbox([
        'exec',
        vm,
        '--timeout',
        '15m',
        '--sudo',
        '--',
        'dnf',
        'install',
        '-y',
        '-q',
        'https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm',
      ])
    }
    await client.streamExec(
      vm,
      '25m',
      `set -e
mkdir -p /vercel/sandbox/framework-tracker
cd /vercel/sandbox/framework-tracker
tar -xzf ../framework-tracker.tgz
rm -f ../framework-tracker.tgz
npm install -g pnpm@11.1.1
pnpm install --frozen-lockfile
node --version
pnpm --version`,
      'setup',
    )
    const output = await client.sandbox([
      'snapshot',
      vm,
      '--stop',
      '--expiration',
      '7d',
    ])
    const snapshot = output.match(/snap_[A-Za-z0-9]+/)?.[0]
    if (!snapshot) {
      throw new Error(
        `Could not parse snapshot id from:\n${output.slice(-1000)}`,
      )
    }
    saveSnapshot(config, key, snapshot)
    console.error(`prepared snapshot ${snapshot}`)
    return snapshot
  } finally {
    await client.remove(vm)
  }
}

function benchmarkArgs(testCase, options) {
  const args = testCase.selector === 'all' ? ['--all'] : [testCase.selector]
  if (options.measurements.length > 0) {
    args.push('--measurement', options.measurements.join(','))
  }
  if (options.runs !== undefined) {
    args.push('--runs', String(options.runs))
  }
  if (testCase.version) {
    args.push('--version', testCase.version)
  }
  return args
}

async function validateCases(root, options) {
  const cli = path.join(
    root,
    'packages',
    'stats-generator',
    'src',
    'run-benchmarks.ts',
  )
  for (const testCase of options.cases) {
    try {
      await execFileP(
        process.execPath,
        [cli, ...benchmarkArgs(testCase, options), '--dry-run'],
        {
          cwd: root,
          env: {
            ...process.env,
            npm_config_userconfig: path.join(root, '.npmrc'),
          },
          maxBuffer: 16 * 1024 * 1024,
        },
      )
    } catch (error) {
      throw new Error(
        `Invalid benchmark case "${testCase.label}": ${
          error.stderr?.trim() || error.stdout?.trim() || error.message
        }`,
      )
    }
  }
}

function remoteScript(vmIndex, options) {
  const commands = []
  for (let block = 1; block <= options.blocks; block += 1) {
    const reverse = (vmIndex + block) % 2 === 1
    const ordered = reverse ? [...options.cases].reverse() : options.cases
    for (const testCase of ordered) {
      const invocation = [
        'pnpm',
        'benchmark',
        ...benchmarkArgs(testCase, options),
      ]
        .map(shellQuote)
        .join(' ')
      commands.push(`
printf '%s\\n' ${shellQuote(`CASE ${testCase.label} block ${block}`)}
find packages -mindepth 2 -maxdepth 2 -type f \\( ${RESULT_FILES.map((file) => `-name ${shellQuote(file)}`).join(' -o ')} \\) -delete
DEST="$OUTPUT/block-${block}/${testCase.id}"
mkdir -p "$DEST"
set +e
${invocation} 2>&1 | tee "$DEST/benchmark.log"
CODE=\${PIPESTATUS[0]}
set -e
if [ "$CODE" -ne 0 ]; then
  printf '%s exit %s\\n' ${shellQuote(
    `benchmark failed: ${testCase.label} block ${block}`,
  )} "$CODE"
  exit "$CODE"
fi
find packages -mindepth 2 -maxdepth 2 -type f \\( ${RESULT_FILES.map((file) => `-name ${shellQuote(file)}`).join(' -o ')} \\) -print0 > /tmp/framework-tracker-result-files
while IFS= read -r -d '' FILE; do
  mkdir -p "$DEST/$(dirname "$FILE")"
  cp "$FILE" "$DEST/$FILE"
done < /tmp/framework-tracker-result-files
`)
    }
  }

  return `#!/usr/bin/env bash
set -euo pipefail
ROOT=/vercel/sandbox/framework-tracker
OUTPUT=/vercel/sandbox/bench-output
rm -rf "$OUTPUT"
mkdir -p "$OUTPUT"
finish() {
  CODE=$?
  trap - EXIT
  printf '%s\\n' "$CODE" > /vercel/sandbox/bench.exit
  tar -czf /vercel/sandbox/bench-results.tgz -C /vercel/sandbox bench-output bench.log bench.exit 2>/dev/null || true
  printf '%s\\n' "$CODE" > /vercel/sandbox/bench.done
  exit "$CODE"
}
trap finish EXIT
cd "$ROOT"
export CI=1
export NO_COLOR=1
if [ -x /opt/google/chrome/chrome ]; then
  export CHROME_PATH=/opt/google/chrome/chrome
fi
echo "vm=${vmIndex} cpu=$(grep -m1 'model name' /proc/cpuinfo | cut -d: -f2- | sed 's/^ //')"
echo "node=$(node --version) pnpm=$(pnpm --version)"
${commands.join('\n')}
echo "all benchmark cases complete"
  `
}

async function validateRemoteScript(options) {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'framework-tracker-bash-check-'),
  )
  const file = path.join(directory, 'run.sh')
  try {
    fs.writeFileSync(file, remoteScript(1, options))
    await execFileP('bash', ['-n', file])
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
}

async function sleep(milliseconds) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function collectVm(client, vm, runDir, index) {
  const archive = path.join(runDir, `vm-${index}.tgz`)
  const directory = path.join(runDir, `vm-${index}`)
  await client.sandbox([
    'cp',
    `${vm}:/vercel/sandbox/bench-results.tgz`,
    archive,
  ])
  fs.mkdirSync(directory, { recursive: true })
  await execFileP('tar', ['-xzf', archive, '-C', directory])
  const exitCode = Number(
    fs.readFileSync(path.join(directory, 'bench.exit'), 'utf8').trim(),
  )
  return exitCode
}

async function runVm(client, snapshot, options, runDir, index, updateStatus) {
  const vm = `ftrack-${options.label}-${index}-${Date.now().toString(36)}`
  updateStatus(index, { vm, phase: 'creating' })
  await client.sandbox([
    'create',
    '--name',
    vm,
    '--snapshot',
    snapshot,
    '--vcpus',
    String(options.vcpus),
    '--timeout',
    options.timeout,
    '--non-persistent',
    '--network-policy',
    'allow-all',
    '--tag',
    'purpose=framework-tracker-bench',
    '--silent',
  ])

  let collected = false
  try {
    const scriptPath = path.join(runDir, `vm-${index}.sh`)
    fs.writeFileSync(scriptPath, remoteScript(index, options))
    await client.sandbox([
      'cp',
      scriptPath,
      `${vm}:/vercel/sandbox/run-benchmarks.sh`,
    ])
    await client.sandbox([
      'exec',
      vm,
      '--timeout',
      '2m',
      '--',
      'bash',
      '-c',
      'rm -f /vercel/sandbox/bench.done /vercel/sandbox/bench.exit /vercel/sandbox/bench.log; nohup bash /vercel/sandbox/run-benchmarks.sh >/vercel/sandbox/bench.log 2>&1 & echo started',
    ])
    updateStatus(index, { vm, phase: 'running' })

    const deadline = Date.now() + timeoutMs(options.timeout)
    let failures = 0
    let lastLine = ''
    while (Date.now() < deadline) {
      await sleep(30_000)
      let output
      try {
        output = await client.sandbox([
          'exec',
          vm,
          '--timeout',
          '2m',
          '--',
          'bash',
          '-c',
          'printf \'@@DONE %s\\n\' "$(cat /vercel/sandbox/bench.done 2>/dev/null || echo no)"; tail -n 8 /vercel/sandbox/bench.log 2>/dev/null || true',
        ])
        failures = 0
      } catch (error) {
        failures += 1
        if (failures >= 6) throw error
        continue
      }
      const done = output.match(/@@DONE (\S+)/)?.[1]
      const progress = output
        .split('\n')
        .filter(
          (line) =>
            line &&
            !line.startsWith('@@DONE') &&
            !line.startsWith('Vercel CLI') &&
            !line.startsWith('$ bash -c') &&
            !line.startsWith('- Fetching'),
        )
        .at(-1)
      if (progress && progress !== lastLine) {
        lastLine = progress
        console.error(`[vm${index}] ${progress}`)
      }
      if (done !== 'no' && done !== undefined) {
        updateStatus(index, { vm, phase: 'collecting' })
        const exitCode = await collectVm(client, vm, runDir, index)
        collected = true
        if (exitCode !== 0) {
          throw new Error(`${vm} benchmark exited ${exitCode}`)
        }
        updateStatus(index, { vm, phase: 'done' })
        return
      }
    }
    throw new Error(`${vm} exceeded local deadline ${options.timeout}`)
  } finally {
    if (!collected) {
      try {
        await collectVm(client, vm, runDir, index)
      } catch {}
    }
    if (!options.keep) await client.remove(vm)
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (!options) {
    usage()
    return
  }
  const root = await repoRoot()
  await validateCases(root, options)
  await validateRemoteScript(options)
  const config = loadConfig({ requireScope: !options.dryRun })
  const needsChrome =
    options.measurements.length === 0 ||
    options.measurements.some(
      (measurement) =>
        measurement === 'clientSideRendered' ||
        measurement === 'serverSideRendered',
    )
  const plan = {
    cases: options.cases.map((testCase) => ({
      ...testCase,
      benchmarkArgs: benchmarkArgs(testCase, options),
    })),
    measurements:
      options.measurements.length > 0 ? options.measurements : ['configured'],
    vms: options.vms,
    concurrency: options.concurrency,
    blocks: options.blocks,
    vcpus: options.vcpus,
    timeout: options.timeout,
    needsChrome,
  }
  console.log(JSON.stringify(plan, null, 2))
  if (options.dryRun) {
    console.log('Dry run complete; no Vercel resources were created.')
    return
  }

  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'framework-tracker-sandbox-bench-'),
  )
  const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${options.label}`
  const runDir = path.join(config.cacheDir, 'runs', runId)
  fs.mkdirSync(runDir, { recursive: true })
  const status = {
    runId,
    runDir,
    createdAt: new Date().toISOString(),
    phase: 'preparing',
    sourceHash: null,
    snapshot: null,
    plan,
    vms: {},
  }
  const writeStatus = () =>
    fs.writeFileSync(
      path.join(runDir, 'meta.json'),
      `${JSON.stringify(status, null, 2)}\n`,
    )
  const updateStatus = (index, patch) => {
    status.vms[index] = {
      ...status.vms[index],
      ...patch,
      updatedAt: new Date().toISOString(),
    }
    writeStatus()
  }
  writeStatus()
  console.error(`run directory: ${runDir}`)

  try {
    const source = await createSourceArchive(root, tempDir)
    status.sourceHash = source.hash
    writeStatus()
    console.error(
      `packed ${source.files} files; source fingerprint ${source.hash}`,
    )
    const client = makeSandboxClient(config)
    const snapshot = await prepareSnapshot(
      client,
      config,
      options,
      source,
      needsChrome,
    )
    status.snapshot = snapshot
    status.phase = 'running'
    writeStatus()

    const results = Array(options.vms)
    let nextVm = 1
    const runWorker = async () => {
      while (nextVm <= options.vms) {
        const index = nextVm
        nextVm += 1
        try {
          await runVm(client, snapshot, options, runDir, index, updateStatus)
          results[index - 1] = { status: 'fulfilled' }
        } catch (reason) {
          results[index - 1] = { status: 'rejected', reason }
        }
      }
    }
    await Promise.all(
      Array.from(
        { length: Math.min(options.concurrency, options.vms) },
        runWorker,
      ),
    )
    const failures = results
      .map((result, index) => ({ result, index: index + 1 }))
      .filter(({ result }) => result.status === 'rejected')
    if (failures.length > 0) {
      status.phase = 'failed'
      writeStatus()
      throw new Error(
        failures
          .map(
            ({ result, index }) =>
              `vm${index}: ${result.status === 'rejected' ? result.reason.message : ''}`,
          )
          .join('\n'),
      )
    }

    status.phase = 'complete'
    writeStatus()
    const summary = await execFileP(
      process.execPath,
      [new URL('./summarize.mjs', import.meta.url).pathname, runDir],
      { maxBuffer: 64 * 1024 * 1024 },
    )
    process.stdout.write(summary.stdout)
    process.stderr.write(summary.stderr)
  } catch (error) {
    status.phase = 'failed'
    status.error = error instanceof Error ? error.message : String(error)
    writeStatus()
    throw error
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
