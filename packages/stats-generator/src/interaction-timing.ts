import type { InteractionTiming } from './types.ts'

export const INTERACTION_SCENARIO = 'first-row-detail-navigation'
export const INTERACTION_SOURCE = 'lighthouse-inp-breakdown'

interface LighthouseAudit {
  details?: unknown
}

interface INPBreakdownDetails {
  items?: Array<{
    type?: string
    items?: Array<{ subpart?: string; duration?: number }>
  }>
}

interface LighthouseTrace {
  traceEvents?: Array<{
    name?: string
    ph?: string
    args?: {
      data?: {
        duration?: number
        interactionId?: number
      }
    }
  }>
}

/**
 * Chrome can emit preliminary sub-1ms Event Timing durations for full-document navigations.
 * Lighthouse drops them before pairing the start and end events used to calculate the final interaction timing.
 * https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/models/trace/handlers/UserInteractionsHandler.ts
 */
export function prepareInteractionTraceForLighthouse(trace: unknown): void {
  const traceEvents = (trace as LighthouseTrace | undefined)?.traceEvents ?? []

  for (const event of traceEvents) {
    const data = event.args?.data
    if (
      event.name === 'EventTiming' &&
      event.ph === 'b' &&
      data?.interactionId &&
      typeof data.duration === 'number' &&
      data.duration < 1
    ) {
      data.duration = 1
    }
  }
}

export function getInteractionTimingFromLighthouse(
  audit: LighthouseAudit | undefined,
): InteractionTiming | null {
  const details = audit?.details as INPBreakdownDetails | undefined
  const items = details?.items?.find((item) => item.type === 'table')?.items
  const inputDelayMs = items?.find(
    (item) => item.subpart === 'inputDelay',
  )?.duration
  const processingDurationMs = items?.find(
    (item) => item.subpart === 'processingDuration',
  )?.duration
  const presentationDelayMs = items?.find(
    (item) => item.subpart === 'presentationDelay',
  )?.duration

  if (
    typeof inputDelayMs !== 'number' ||
    !Number.isFinite(inputDelayMs) ||
    inputDelayMs < 0 ||
    typeof processingDurationMs !== 'number' ||
    !Number.isFinite(processingDurationMs) ||
    processingDurationMs < 0 ||
    typeof presentationDelayMs !== 'number' ||
    !Number.isFinite(presentationDelayMs) ||
    presentationDelayMs < 0
  ) {
    return null
  }

  const interactionLatencyMs =
    inputDelayMs + processingDurationMs + presentationDelayMs

  if (interactionLatencyMs <= 0) {
    return null
  }

  return {
    interactionLatencyMs,
    inputDelayMs,
    processingDurationMs,
    presentationDelayMs,
  }
}
