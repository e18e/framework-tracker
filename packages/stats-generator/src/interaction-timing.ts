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

export function getInteractionTimingFromLighthouse(
  audit: LighthouseAudit | undefined,
): InteractionTiming | null {
  const details = audit?.details as INPBreakdownDetails | undefined
  const items = details?.items?.find(
    (item) => item.type === 'table',
  )?.items
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
    inputDelayMs == null ||
    processingDurationMs == null ||
    presentationDelayMs == null
  ) {
    return null
  }

  return {
    interactionLatencyMs:
      inputDelayMs + processingDurationMs + presentationDelayMs,
    inputDelayMs,
    processingDurationMs,
    presentationDelayMs,
  }
}
