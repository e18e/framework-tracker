import { existsSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import puppeteer from 'puppeteer-core'
import { startFlow } from 'lighthouse'
import type {
  ClientSideRenderedBenchmarkResult,
  ClientSideRenderedRunResult,
} from './types.ts'

const CLIENT_SIDE_RENDERED_PATH = '/client-side-rendered'

function findChromium(): string {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH

  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (browsersPath && existsSync(browsersPath)) {
    const chromiumDir = readdirSync(browsersPath).find((e) =>
      e.startsWith('chromium-'),
    )
    if (chromiumDir) {
      const chromePath = `${browsersPath}/${chromiumDir}/chrome-linux/chrome`
      if (existsSync(chromePath)) return chromePath
    }
  }

  const candidates = [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }

  throw new Error(
    'Could not find Chromium/Chrome. Set the CHROME_PATH env var.',
  )
}

function getBrowserVersion(chromiumPath: string): string | undefined {
  try {
    return execFileSync(chromiumPath, ['--version'], {
      encoding: 'utf-8',
    }).trim()
  } catch {
    return undefined
  }
}

async function runOnce(
  url: string,
  chromiumPath: string,
): Promise<ClientSideRenderedRunResult> {
  const browser = await puppeteer.launch({
    executablePath: chromiumPath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()

    const flow = await startFlow(page, {
      name: 'Client side rendered benchmark',
      flags: {
        throttlingMethod: 'provided',
        formFactor: 'desktop',
        screenEmulation: { disabled: true },
      },
    })

    // FP + FCP: navigate to the client-rendered route and wait for the table.
    await flow.navigate(`${url}${CLIENT_SIDE_RENDERED_PATH}`)
    await page.waitForSelector('table tbody tr', { timeout: 15_000 })

    // INP: click the first row's detail link
    await flow.startTimespan()
    await page.click('table tbody tr:first-child a')
    await page.waitForSelector('#detail-id', { timeout: 15_000 })
    // Double rAF ensures the paint entry is recorded before the timespan ends.
    await page.evaluate(
      (): Promise<void> =>
        new Promise((r) => {
          // @ts-expect-error — callback runs in browser context, not Node.js
          requestAnimationFrame(() => requestAnimationFrame(r))
        }),
    )
    await flow.endTimespan()

    const flowResult = await flow.createFlowResult()
    const navLhr = flowResult.steps[0].lhr
    const timespanLhr = flowResult.steps[1].lhr

    const metricsItems = (
      navLhr.audits['metrics']?.details as { items?: Record<string, number>[] }
    )?.items?.[0]
    const firstPaintMs = metricsItems?.observedFirstPaint ?? null
    const fcpMs = navLhr.audits['first-contentful-paint']?.numericValue ?? null
    const inpMs =
      timespanLhr.audits['interaction-to-next-paint']?.numericValue ?? null

    await page.close()
    return { firstPaintMs, fcpMs, inpMs }
  } finally {
    await browser.close()
  }
}

function avg(values: number[]): number {
  if (values.length === 0) return 0
  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2))
}

export async function runBenchmark(
  url: string,
  packageName: string,
  displayName: string,
  runs: number,
): Promise<ClientSideRenderedBenchmarkResult> {
  const chromiumPath = findChromium()
  const browserVersion = getBrowserVersion(chromiumPath)
  const results: ClientSideRenderedRunResult[] = []

  for (let i = 0; i < runs; i++) {
    console.log(`  Run ${i + 1}/${runs}...`)
    results.push(await runOnce(url, chromiumPath))
  }

  const fp = results
    .map((r) => r.firstPaintMs)
    .filter((v): v is number => v !== null)
  const fcp = results.map((r) => r.fcpMs).filter((v): v is number => v !== null)
  const inp = results.map((r) => r.inpMs).filter((v): v is number => v !== null)

  return {
    name: packageName,
    displayName,
    package: packageName,
    browserVersion,
    clientSideRenderedTests: {
      firstPaintMs: avg(fp),
      fcpMs: avg(fcp),
      inpMs: avg(inp),
      runs: results.length,
    },
  }
}
