import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  prepareLighthouseClientSideRenderedTestsInteractionHistory,
  prepareLighthouseServerSideRenderedTestsInteractionHistory,
} from './chart-measurements.ts'

const run = (
  inputDelayMs: number,
  processingDurationMs: number,
  presentationDelayMs: number,
) => ({
  interactionTests: {
    inputDelayMs,
    processingDurationMs,
    presentationDelayMs,
    interactionLatencyMs:
      inputDelayMs + processingDurationMs + presentationDelayMs,
  },
})

const runs = [
  run(1, 30, 9),
  run(2, 10, 3),
  run(1, 20, 9),
  run(5, 40, 20),
  run(3, 12, 10),
]

test('uses the run with the median total so the phases add up to it', () => {
  const [row] = prepareLighthouseClientSideRenderedTestsInteractionHistory([
    {
      package: 'app-next',
      frameworkVersion: '14.0.0',
      clientSideRenderedTests: { iterations: runs },
    },
  ])
  assert.deepEqual(row, {
    id: 'app-next:14.0.0',
    name: 'v14.0.0',
    inputDelayMs: 1,
    processingDurationMs: 20,
    presentationDelayMs: 9,
    interactionLatencyMs: 30,
  })
})

test('skips versions without complete runs and keeps input order', () => {
  const records = [
    {
      frameworkVersion: '14.0.0',
      clientSideRenderedTests: { iterations: [run(1, 2, 3)] },
    },
    { frameworkVersion: '15.0.0', clientSideRenderedTests: {} },
    {
      frameworkVersion: '16.0.0',
      clientSideRenderedTests: {
        iterations: [
          {
            interactionTests: {
              ...run(1, 2, 3).interactionTests,
              inputDelayMs: Number.NaN,
            },
          },
        ],
      },
    },
    {
      frameworkVersion: '17.0.0',
      clientSideRenderedTests: { iterations: [run(4, 5, 6)] },
    },
  ]
  assert.deepEqual(
    prepareLighthouseClientSideRenderedTestsInteractionHistory(records).map(
      (row) => row.name,
    ),
    ['v14.0.0', 'v17.0.0'],
  )
})

test('server history reads the server runs', () => {
  const [row] = prepareLighthouseServerSideRenderedTestsInteractionHistory([
    {
      frameworkVersion: '14.0.0',
      clientSideRenderedTests: { iterations: [run(1, 1, 1)] },
      serverSideRenderedTests: { iterations: [run(7, 8, 9)] },
    },
  ])
  assert.equal(row?.interactionLatencyMs, 24)
})

test('history is empty when no version has runs', () => {
  assert.deepEqual(
    prepareLighthouseClientSideRenderedTestsInteractionHistory([
      { package: 'app-pracht', frameworkVersion: '1.0.0' },
    ]),
    [],
  )
})
