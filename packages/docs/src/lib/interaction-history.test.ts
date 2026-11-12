import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  prepareLighthouseClientSideRenderedTestsInteractionHistory,
  prepareLighthouseServerSideRenderedTestsInteractionHistory,
} from './chart-measurements.ts'
import { formatRendered } from './result-content.ts'

const timings = (
  inputDelayMs: number,
  processingDurationMs: number,
  presentationDelayMs: number,
) => ({
  inputDelayMs,
  processingDurationMs,
  presentationDelayMs,
  interactionLatencyMs:
    inputDelayMs + processingDurationMs + presentationDelayMs,
})
const metric = (value: number) => ({
  unit: 'ms' as const,
  mean: value,
  median: value,
  min: value,
  max: value,
})

test('rendered tests take interaction phases from the run with the median total', () => {
  const runs = [
    timings(1, 30, 9),
    timings(2, 10, 3),
    timings(1, 20, 9),
    timings(5, 40, 20),
    timings(3, 12, 10),
  ]
  const formatted = formatRendered({
    name: 'clientSideRendered',
    runs: runs.length,
    iterations: runs.map((interactionTests) => ({
      firstPaintMs: { value: 100, unit: 'ms' },
      fcpMs: { value: 100, unit: 'ms' },
      interactionTests: {
        inputDelayMs: { value: interactionTests.inputDelayMs, unit: 'ms' },
        processingDurationMs: {
          value: interactionTests.processingDurationMs,
          unit: 'ms',
        },
        presentationDelayMs: {
          value: interactionTests.presentationDelayMs,
          unit: 'ms',
        },
        interactionLatencyMs: {
          value: interactionTests.interactionLatencyMs,
          unit: 'ms',
        },
      },
    })),
    firstPaintMs: metric(100),
    fcpMs: metric(100),
    interactionTests: {
      scenario: 'first-row-detail-navigation',
      source: 'lighthouse-inp-breakdown',
      interactionLatencyMs: metric(30),
      inputDelayMs: metric(2),
      processingDurationMs: metric(20),
      presentationDelayMs: metric(9),
    },
  })

  assert.deepEqual(formatted.interactionTests, {
    scenario: 'first-row-detail-navigation',
    source: 'lighthouse-inp-breakdown',
    ...timings(1, 20, 9),
  })
})

test('history keeps versions with complete interaction data, in input order', () => {
  const records = [
    {
      package: 'app-next',
      frameworkVersion: '14.0.0',
      clientSideRenderedTests: { interactionTests: timings(1, 2, 3) },
    },
    { frameworkVersion: '15.0.0', clientSideRenderedTests: {} },
    {
      frameworkVersion: '16.0.0',
      clientSideRenderedTests: {
        interactionTests: { ...timings(1, 2, 3), inputDelayMs: Number.NaN },
      },
    },
    {
      frameworkVersion: '17.0.0',
      clientSideRenderedTests: { interactionTests: timings(4, 5, 6) },
    },
  ]
  assert.deepEqual(
    prepareLighthouseClientSideRenderedTestsInteractionHistory(records),
    [
      { id: 'app-next:14.0.0', name: 'v14.0.0', ...timings(1, 2, 3) },
      { id: 'unknown:17.0.0', name: 'v17.0.0', ...timings(4, 5, 6) },
    ],
  )
})

test('server history reads the server measurements', () => {
  const [row] = prepareLighthouseServerSideRenderedTestsInteractionHistory([
    {
      frameworkVersion: '14.0.0',
      clientSideRenderedTests: { interactionTests: timings(1, 1, 1) },
      serverSideRenderedTests: { interactionTests: timings(7, 8, 9) },
    },
  ])
  assert.equal(row?.interactionLatencyMs, 24)
})

test('history is empty when no version has interaction data', () => {
  assert.deepEqual(
    prepareLighthouseClientSideRenderedTestsInteractionHistory([
      { package: 'app-pracht', frameworkVersion: '1.0.0' },
    ]),
    [],
  )
})
