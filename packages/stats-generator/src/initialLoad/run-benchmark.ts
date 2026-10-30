import puppeteer from 'puppeteer-core'
import { startFlow } from 'lighthouse'
import { z } from 'zod'
import {
  InitialLoadResourceTypeSchema,
  InitialLoadResourceSchema,
  InitialLoadStatsSchema,
} from '@framework-tracker/results'
import { findChromium } from '../find-chromium.ts'

const ResourceRowsSchema = z.array(
  InitialLoadResourceSchema.extend({
    resourceType: InitialLoadResourceTypeSchema,
  }),
)

export function parseResourceSummary(details: unknown) {
  const table = z
    .object({ type: z.literal('table'), items: ResourceRowsSchema })
    .parse(details)
  const resources = Object.fromEntries(
    table.items.map(({ resourceType, requestCount, transferSize }) => [
      resourceType,
      { requestCount, transferSize },
    ]),
  )
  if (
    new Set(table.items.map((row) => row.resourceType)).size !==
    table.items.length
  ) {
    throw new Error('Duplicate Lighthouse resource-summary category')
  }
  // Do not include third-party when calculating totals.
  // https://developer.chrome.com/docs/lighthouse/performance/resource-summary
  return InitialLoadStatsSchema.parse({
    name: 'initialLoad',
    source: 'lighthouse-resource-summary',
    path: '/initial-load',
    resources,
  })
}

export async function runBenchmark(url: string) {
  const browser = await puppeteer.launch({
    executablePath: findChromium(),
    headless: true,
    defaultViewport: { width: 800, height: 600, deviceScaleFactor: 1 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  try {
    const page = await browser.newPage()
    const flow = await startFlow(page, {
      name: 'Initial load',
      flags: {
        throttlingMethod: 'provided',
        formFactor: 'desktop',
        screenEmulation: { disabled: true },
        onlyAudits: ['resource-summary'],
      },
    })
    await flow.navigate(`${url}/initial-load`)
    const result = await flow.createFlowResult()
    const lhr = result.steps[0]?.lhr
    if (!lhr || lhr.runtimeError) {
      throw new Error(
        `Initial load failed: ${lhr?.runtimeError?.message ?? 'Missing Lighthouse result'}`,
      )
    }
    return {
      browserVersion: await browser.version(),
      initialLoadTests: parseResourceSummary(
        lhr.audits['resource-summary']?.details,
      ),
    }
  } finally {
    await browser.close()
  }
}
