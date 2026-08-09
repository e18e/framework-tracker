export const INTERACTION_SCENARIO = 'first-row-detail-navigation'
export const INTERACTION_SOURCE = 'chrome-event-timing'

export interface InteractionTiming {
  interactionLatencyMs: number
  inputDelayMs: number
  processingDurationMs: number
  presentationDelayMs: number
}

export interface InteractionTestStats extends InteractionTiming {
  scenario: typeof INTERACTION_SCENARIO
  source: typeof INTERACTION_SOURCE
}

interface EventTimingData {
  duration?: number
  interactionId?: number
  processingEnd?: number
  processingStart?: number
  timeStamp?: number
}

interface TraceEvent {
  name?: string
  ph?: string
  args?: {
    data?: EventTimingData
  }
}

export function getInteractionTimingFromTrace(
  traceEvents: TraceEvent[],
): InteractionTiming | null {
  for (const event of traceEvents) {
    if (event.name !== 'EventTiming' || event.ph === 'e') continue

    const data = event.args?.data
    const interactionId = data?.interactionId
    const duration = data?.duration
    const processingEnd = data?.processingEnd
    const processingStart = data?.processingStart
    const timeStamp = data?.timeStamp
    if (
      interactionId == null ||
      interactionId <= 0 ||
      duration == null ||
      processingEnd == null ||
      processingStart == null ||
      timeStamp == null
    ) {
      continue
    }

    return {
      interactionLatencyMs: duration,
      inputDelayMs: processingStart - timeStamp,
      processingDurationMs: processingEnd - processingStart,
      presentationDelayMs: timeStamp + duration - processingEnd,
    }
  }

  return null
}
