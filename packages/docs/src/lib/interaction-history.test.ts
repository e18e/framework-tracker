import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  prepareLighthouseClientSideRenderedTestsInteractionHistory,
  prepareLighthouseServerSideRenderedTestsInteractionHistory,
} from './chart-measurements.ts'
import { formatRendered } from './result-content.ts'

const timings = (
  inputDelay: number,
  processingDuration: number,
  presentationDelay: number,
) => ({
  inputDelay,
  processingDuration,
  presentationDelay,
  interactionLatency: inputDelay + processingDuration + presentationDelay,
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
      firstPaint: { value: 100, unit: 'ms' },
      firstContentfulPaint: { value: 100, unit: 'ms' },
      interactionTests: {
        inputDelay: { value: interactionTests.inputDelay, unit: 'ms' },
        processingDuration: {
          value: interactionTests.processingDuration,
          unit: 'ms',
        },
        presentationDelay: {
          value: interactionTests.presentationDelay,
          unit: 'ms',
        },
        interactionLatency: {
          value: interactionTests.interactionLatency,
          unit: 'ms',
        },
      },
    })),
    firstPaint: metric(100),
    firstContentfulPaint: metric(100),
    interactionTests: {
      interactionLatency: metric(30),
      inputDelay: metric(2),
      processingDuration: metric(20),
      presentationDelay: metric(9),
    },
  })

  assert.deepEqual(formatted.interactionTests, {
    ...timings(1, 20, 9),
  })
})

test('history keeps versions with complete interaction data, in input order', () => {
  const records = [
    {
      package: 'app-next',
      frameworkVersion: '14.0.0',
      clientSideRendered: { interactionTests: timings(1, 2, 3) },
    },
    { frameworkVersion: '15.0.0', clientSideRendered: {} },
    {
      frameworkVersion: '16.0.0',
      clientSideRendered: {
        interactionTests: { ...timings(1, 2, 3), inputDelay: Number.NaN },
      },
    },
    {
      frameworkVersion: '17.0.0',
      clientSideRendered: { interactionTests: timings(4, 5, 6) },
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
      clientSideRendered: { interactionTests: timings(1, 1, 1) },
      serverSideRendered: { interactionTests: timings(7, 8, 9) },
    },
  ])
  assert.equal(row?.interactionLatency, 24)
})

test('history is empty when no version has interaction data', () => {
  assert.deepEqual(
    prepareLighthouseClientSideRenderedTestsInteractionHistory([
      { package: 'app-pracht', frameworkVersion: '1.0.0' },
    ]),
    [],
  )
})
