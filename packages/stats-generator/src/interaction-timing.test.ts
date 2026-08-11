import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getInteractionTimingFromLighthouse,
  prepareInteractionTraceForLighthouse,
} from './interaction-timing.ts'

test('normalizes only relevant Event Timing start records', () => {
  const trace = {
    traceEvents: [
      eventTiming('b', 1, 0),
      eventTiming('b', 1, 0.999),
      eventTiming('b', 1, 1),
      eventTiming('b', 0, 0.5),
      eventTiming('e', 1, 0.5),
      {
        name: 'OtherEvent',
        ph: 'b',
        args: { data: { interactionId: 1, duration: 0 } },
      },
    ],
  }

  assert.equal(prepareInteractionTraceForLighthouse(trace), 2)
  assert.deepEqual(
    trace.traceEvents.map((event) => event.args.data.duration),
    [1, 1, 1, 0.5, 0.5, 0],
  )
})

test('uses the Lighthouse phase values without applying a correction', () => {
  const result = getInteractionTimingFromLighthouse({
    details: {
      items: [
        {
          type: 'table',
          items: [
            { subpart: 'inputDelay', duration: 0.25 },
            { subpart: 'processingDuration', duration: 0.5 },
            { subpart: 'presentationDelay', duration: 12.75 },
          ],
        },
      ],
    },
  })

  assert.deepEqual(result, {
    interactionLatencyMs: 13.5,
    inputDelayMs: 0.25,
    processingDurationMs: 0.5,
    presentationDelayMs: 12.75,
  })
})

function eventTiming(ph: string, interactionId: number, duration: number) {
  return {
    name: 'EventTiming',
    ph,
    args: { data: { interactionId, duration } },
  }
}
