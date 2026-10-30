import { execFileSync } from 'node:child_process'
import puppeteer from 'puppeteer-core'
import { startFlow } from 'lighthouse'
import { findChromium } from '../find-chromium.ts'
import { warmUpServer } from '../server-warmup.ts'
import {
  getInteractionTimingFromLighthouse,
  getNavigationInteractionTimingFromLighthouse,
  prepareInteractionTraceForLighthouse,
} from '../interaction-timing.ts'
import type {
  ServerSideRenderedBenchmarkResult,
  ServerSideRenderedRunResult,
} from './types.ts'
import { assembleServerRendering } from '../server-rendering.ts'

const SERVER_SIDE_RENDERED_PATH = '/server-side-rendered'

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
  fullDocumentNavigation: boolean,
): Promise<ServerSideRenderedRunResult> {
  const browser = await puppeteer.launch({
    executablePath: chromiumPath,
    headless: true,
    defaultViewport: { width: 800, height: 600, deviceScaleFactor: 1 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()

    const flow = await startFlow(page, {
      name: 'Server side rendered benchmark',
      flags: {
        throttlingMethod: 'provided',
        formFactor: 'desktop',
        screenEmulation: { disabled: true },
        onlyAudits: [
          'metrics',
          'first-contentful-paint',
          'inp-breakdown-insight',
        ],
      },
    })

    // FP + FCP: navigate to the server-rendered route and wait for the table.
    await flow.navigate(`${url}${SERVER_SIDE_RENDERED_PATH}`)
    await page.waitForSelector('table tbody tr', { timeout: 15_000 })

    // Use navigation mode when the interaction triggers a full document load.
    // https://github.com/GoogleChrome/lighthouse/blob/main/docs/user-flows.md#triggering-a-navigation-via-user-interactions
    if (fullDocumentNavigation) {
      await flow.startNavigation()
      await page.click('table tbody tr:first-child a')
      await flow.endNavigation()
      await page.waitForSelector('#detail-id', { timeout: 15_000 })
    } else {
      await flow.startTimespan()
      await page.click('table tbody tr:first-child a')
      await page.waitForSelector('#detail-id', { timeout: 15_000 })
      // Double rAF ensures the paint entry is recorded before the timespan ends.
      await page.evaluate((): Promise<void> => {
        const { requestAnimationFrame: nextFrame } = globalThis as unknown as {
          requestAnimationFrame: (callback: () => void) => number
        }

        return new Promise((resolve) => {
          nextFrame(() => nextFrame(resolve))
        })
      })
      await flow.endTimespan()
    }

    const interactionArtifacts =
      flow.createArtifactsJson().gatherSteps[1]?.artifacts
    if (fullDocumentNavigation) {
      prepareInteractionTraceForLighthouse(interactionArtifacts?.Trace)
    }

    const flowResult = await flow.createFlowResult()
    const navLhr = flowResult.steps[0].lhr
    const interactionLhr = flowResult.steps[1].lhr

    const metricsItems = (
      navLhr.audits['metrics']?.details as { items?: Record<string, number>[] }
    )?.items?.[0]
    const firstPaintMs = metricsItems?.observedFirstPaint ?? null
    const fcpMs = navLhr.audits['first-contentful-paint']?.numericValue ?? null
    const interaction =
      fullDocumentNavigation && interactionArtifacts
        ? await getNavigationInteractionTimingFromLighthouse(
            interactionArtifacts,
            interactionLhr.configSettings,
          )
        : getInteractionTimingFromLighthouse(
            interactionLhr.audits['inp-breakdown-insight'],
          )

    await page.close()
    return { firstPaintMs, fcpMs, interaction }
  } finally {
    await browser.close()
  }
}

export async function runBenchmark(
  url: string,
  packageName: string,
  displayName: string,
  runs: number,
  fullDocumentNavigation: boolean,
): Promise<ServerSideRenderedBenchmarkResult> {
  const chromiumPath = findChromium()
  const browserVersion = getBrowserVersion(chromiumPath)
  if (!browserVersion) {
    throw new Error(`Could not read Chrome version from ${chromiumPath}`)
  }
  const results: ServerSideRenderedRunResult[] = []

  console.info(
    '  Warming the server list and detail pages before measurements...',
  )
  await warmUpServer(`${url}${SERVER_SIDE_RENDERED_PATH}`, true)

  for (let i = 0; i < runs; i++) {
    console.info(`  Run ${i + 1}/${runs}...`)
    results.push(await runOnce(url, chromiumPath, fullDocumentNavigation))
  }

  const fp = results
    .map((r) => r.firstPaintMs)
    .filter((v): v is number => v !== null)
  const fcp = results.map((r) => r.fcpMs).filter((v): v is number => v !== null)
  if (
    fp.length !== results.length ||
    fp.some((value) => !Number.isFinite(value) || value <= 0)
  ) {
    throw new Error('First Paint was missing, non-finite, or zero')
  }
  if (
    fcp.length !== results.length ||
    fcp.some((value) => !Number.isFinite(value) || value <= 0)
  ) {
    throw new Error('FCP was missing, non-finite, or zero')
  }
  const interactions = results
    .map((r) => r.interaction)
    .filter((value) => value !== null)
  if (interactions.length !== results.length) {
    throw new Error(
      `Interaction timing could not be measured in ${results.length - interactions.length} of ${results.length} runs`,
    )
  }

  const samples = results.map((_, index) => ({
    firstPaintMs: fp[index],
    fcpMs: fcp[index],
    interactionTests: interactions[index],
  }))
  return {
    name: packageName,
    displayName,
    package: packageName,
    browserVersion,
    serverSideRenderedTests: assembleServerRendering(samples),
  }
}
