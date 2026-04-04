import { existsSync, readdirSync } from 'node:fs'
import puppeteer from 'puppeteer-core'
import { startFlow } from 'lighthouse'
import type { SPABenchmarkResult, SPARunResult } from './types.ts'

const SPA_PATH = '/spa'

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

async function runOnce(
  url: string,
  chromiumPath: string,
): Promise<SPARunResult> {
  const browser = await puppeteer.launch({
    executablePath: chromiumPath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()

    const flow = await startFlow(page, {
      name: 'SPA benchmark',
      flags: {
        throttlingMethod: 'provided',
        formFactor: 'desktop',
        screenEmulation: { disabled: true },
      },
    })

    // FP + FCP: navigate to /spa, wait for the table to render
    await flow.navigate(`${url}${SPA_PATH}`)
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
): Promise<SPABenchmarkResult> {
  const chromiumPath = findChromium()
  const results: SPARunResult[] = []

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
    spaFirstPaintMs: avg(fp),
    spaFCPMs: avg(fcp),
    spaINPMs: avg(inp),
    spaRuns: results.length,
  }
}
