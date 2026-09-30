import { spawn, execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(repo, 'packages/stats-generator/package.json'))
const puppeteer = require('puppeteer-core')
const lighthouseEntry = require.resolve('lighthouse')
const lighthouseRoot = resolve(dirname(lighthouseEntry), '..')
const modifiedRoot = join(dirname(lighthouseRoot), 'lighthouse-instrumentation-study')
const chromeCandidates = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
]
const chromePath = chromeCandidates.find((candidate) => candidate && existsSync(candidate))
if (!chromePath) throw new Error('Chrome not found; set CHROME_PATH')

const {
  getInteractionTimingFromLighthouse,
  getNavigationInteractionTimingFromLighthouse,
  prepareInteractionTraceForLighthouse,
} = await import(
  pathToFileURL(join(repo, 'packages/stats-generator/src/interaction-timing.ts')).href
)

const frameworks = {
  'app-astro': { serve: 'astro.ts', fullNavigation: true },
  'app-next-js': { serve: 'next.ts', fullNavigation: false },
  'app-nuxt': { serve: 'nitro.ts', fullNavigation: false },
  'app-react-router': { serve: 'react-router.ts', fullNavigation: false },
  'app-solid-start': { serve: 'nitro.ts', fullNavigation: false },
  'app-sveltekit': { serve: 'sveltekit.ts', fullNavigation: false },
  'app-tanstack-start-react': { serve: 'tanstack-start.ts', fullNavigation: false },
}

function readArguments() {
  const args = process.argv.slice(2)
  const values = {}
  for (let i = 0; i < args.length; i += 2) {
    const name = args[i]
    const value = args[i + 1]
    if (!name?.startsWith('--') || !value) {
      throw new Error('Usage: --framework app-name --scenario ssr|csr --runs 5 --output path')
    }
    values[name.slice(2)] = value
  }
  const { framework, scenario, output } = values
  const runs = Number(values.runs ?? 5)
  if (!frameworks[framework] || !['ssr', 'csr'].includes(scenario) || !Number.isInteger(runs) || runs < 1 || !output) {
    throw new Error('Usage: --framework app-name --scenario ssr|csr --runs 5 --output path')
  }
  return { framework, scenario, runs, output: resolve(output) }
}

function createStackFreeCopy() {
  if (existsSync(modifiedRoot)) {
    throw new Error(`Temporary Lighthouse copy already exists: ${modifiedRoot}`)
  }
  cpSync(lighthouseRoot, modifiedRoot, { recursive: true })
  const tracePath = join(modifiedRoot, 'core/gather/gatherers/trace.js')
  const trace = readFileSync(tracePath, 'utf8')
  const category = "      'disabled-by-default-devtools.timeline.stack',"
  if (!trace.includes(category)) throw new Error('Lighthouse timeline stack category changed')
  writeFileSync(tracePath, trace.replace(category, ''))

  const preparePath = join(modifiedRoot, 'core/gather/driver/prepare.js')
  const prepare = readFileSync(preparePath, 'utf8')
  const start = prepare.indexOf('async function enableAsyncStacks(session) {')
  const end = prepare.indexOf('\n/**\n * Use a RequestIdleCallback', start)
  if (start < 0 || end < 0) throw new Error('Lighthouse async stack setup changed')
  writeFileSync(
    preparePath,
    prepare.slice(0, start) +
      'async function enableAsyncStacks(_session) {\n  return async () => {};\n}\n' +
      prepare.slice(end),
  )
}

async function waitForServer(child, url, getStderr) {
  const deadline = Date.now() + 45_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Server exited ${child.exitCode}: ${getStderr()}`)
    }
    try {
      const response = await fetch(url)
      if (response.status === 200) return
    } catch {
      // Server startup is still in progress.
    }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
  throw new Error(`Server did not become ready: ${getStderr()}`)
}

async function stopServer(child) {
  if (child.exitCode !== null) return
  child.kill('SIGTERM')
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ])
  if (child.exitCode === null) child.kill('SIGKILL')
}

function conditionOrder(index) {
  const conditions = ['baseline', 'coverage-off', 'stacks-off', 'both-off']
  const rotated = [...conditions.slice(index % 4), ...conditions.slice(0, index % 4)]
  return index % 2 === 0 ? rotated : rotated.reverse()
}

async function runOnce(startFlow, baseUrl, scenario, fullNavigation, condition) {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  try {
    const page = await browser.newPage()
    const flags = {
      throttlingMethod: 'provided',
      formFactor: 'desktop',
      screenEmulation: { disabled: true },
    }
    if (condition === 'coverage-off' || condition === 'both-off') {
      flags.skipAudits = ['unused-javascript', 'script-treemap-data']
    }
    const flow = await startFlow(page, { name: 'Instrumentation study', flags })
    const route = scenario === 'ssr' ? '/server-side-rendered' : '/client-side-rendered'
    await flow.navigate(`${baseUrl}${route}`)
    await page.waitForSelector('table tbody tr', { timeout: 15_000 })

    if (fullNavigation) {
      await flow.startNavigation()
      await page.click('table tbody tr:first-child a')
      await flow.endNavigation()
      await page.waitForSelector('#detail-id', { timeout: 15_000 })
    } else {
      await flow.startTimespan()
      await page.click('table tbody tr:first-child a')
      await page.waitForSelector('#detail-id', { timeout: 15_000 })
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      )
      await flow.endTimespan()
    }

    const steps = flow.createArtifactsJson().gatherSteps
    const navigationArtifacts = steps[0].artifacts
    const interactionArtifacts = steps[1].artifacts
    if (fullNavigation) prepareInteractionTraceForLighthouse(interactionArtifacts.Trace)
    const flowResult = await flow.createFlowResult()
    const navigationLhr = flowResult.steps[0].lhr
    const interactionLhr = flowResult.steps[1].lhr
    const metrics = navigationLhr.audits.metrics?.details?.items?.[0]
    const firstPaintMs = metrics?.observedFirstPaint
    const fcpMs = navigationLhr.audits['first-contentful-paint']?.numericValue
    const interaction = fullNavigation
      ? await getNavigationInteractionTimingFromLighthouse(
          interactionArtifacts,
          interactionLhr.configSettings,
        )
      : getInteractionTimingFromLighthouse(interactionLhr.audits['inp-breakdown-insight'])
    if (
      !Number.isFinite(firstPaintMs) || firstPaintMs <= 0 ||
      !Number.isFinite(fcpMs) || fcpMs <= 0 ||
      !interaction
    ) {
      throw new Error('Missing paint or interaction timing')
    }

    const coverageExpected = condition === 'baseline' || condition === 'stacks-off'
    const stackExpected = condition === 'baseline' || condition === 'coverage-off'
    const jsUsagePresent = Boolean(navigationArtifacts.JsUsage && interactionArtifacts.JsUsage)
    const stackEventCount = interactionArtifacts.Trace?.traceEvents?.filter(
      (event) => event.args?.data?.stackTrace,
    ).length ?? 0
    if (jsUsagePresent !== coverageExpected || (!stackExpected && stackEventCount !== 0)) {
      throw new Error(`Instrumentation mismatch: coverage=${jsUsagePresent}, stack events=${stackEventCount}`)
    }

    return {
      firstPaintMs,
      fcpMs,
      interactionLatencyMs: interaction.interactionLatencyMs,
      inputDelayMs: interaction.inputDelayMs,
      processingDurationMs: interaction.processingDurationMs,
      presentationDelayMs: interaction.presentationDelayMs,
      jsUsagePresent,
      stackEventCount,
    }
  } finally {
    await browser.close()
  }
}

async function main() {
  const { framework, scenario, runs, output } = readArguments()
  const config = frameworks[framework]
  const route = scenario === 'ssr' ? '/server-side-rendered' : '/client-side-rendered'
  const port = 43187
  const baseUrl = `http://127.0.0.1:${port}`
  const serverPath = join(repo, 'packages/stats-generator/src/serve', config.serve)
  const appDir = join(repo, 'packages', framework)
  const browserVersion = execFileSync(chromePath, ['--version'], { encoding: 'utf8' }).trim()
  const gitSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim()
  const results = {
    framework,
    scenario,
    route,
    runsPerCondition: runs,
    browserVersion,
    lighthouseVersion: require('lighthouse/package.json').version,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    gitSha,
    startedAt: new Date().toISOString(),
    conditions: {
      baseline: 'Default Lighthouse instrumentation',
      'coverage-off': 'Precise JavaScript coverage disabled',
      'stacks-off': 'Timeline stack capture and debugger async stack tracking disabled',
      'both-off': 'Coverage and stack instrumentation disabled',
    },
    samples: [],
  }

  let copied = false
  let child
  try {
    createStackFreeCopy()
    copied = true
    const baselineStartFlow = (await import(pathToFileURL(lighthouseEntry).href)).startFlow
    const stackFreeStartFlow = (
      await import(pathToFileURL(join(modifiedRoot, 'core/index.js')).href)
    ).startFlow
    let stderr = ''
    child = spawn(process.execPath, [serverPath, appDir], {
      env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), NODE_ENV: 'production' },
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    child.stderr.on('data', (chunk) => {
      stderr = (stderr + chunk.toString()).slice(-4_000)
    })
    await waitForServer(child, `${baseUrl}${route}`, () => stderr)
    for (let block = 0; block < runs; block++) {
      for (const condition of conditionOrder(block)) {
        const startFlow = condition === 'baseline' || condition === 'coverage-off'
          ? baselineStartFlow : stackFreeStartFlow
        const sample = await runOnce(
          startFlow,
          baseUrl,
          scenario,
          config.fullNavigation,
          condition,
        )
        results.samples.push({ block: block + 1, condition, ...sample })
        mkdirSync(dirname(output), { recursive: true })
        writeFileSync(output, JSON.stringify(results, null, 2) + '\n')
        console.log(`${framework} ${scenario} ${condition} ${block + 1}/${runs}: FCP ${sample.fcpMs.toFixed(2)} ms, interaction ${sample.interactionLatencyMs.toFixed(2)} ms`)
      }
    }
    results.finishedAt = new Date().toISOString()
    writeFileSync(output, JSON.stringify(results, null, 2) + '\n')
    console.log(`Saved ${output}`)
  } finally {
    if (child) await stopServer(child)
    if (copied) rmSync(modifiedRoot, { recursive: true, force: true })
  }
}

await main()
