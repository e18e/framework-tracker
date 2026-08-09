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
    args?: { data?: { interactionId?: number } }
  }>
}

export function logInteractionTrace(
  trace: unknown,
  measured: boolean,
): void {
  const traceEvents = (trace as LighthouseTrace | undefined)?.traceEvents
    ?.filter(
      (event) =>
        (event.name === 'EventTiming' &&
          (event.args?.data?.interactionId ?? 0) > 0) ||
        event.name === 'Responsiveness.Renderer.UserInteraction',
    )

  console.log(
    `Full-document interaction trace (${measured ? 'measured' : 'missing'}):`,
  )
  console.log(JSON.stringify(traceEvents ?? [], null, 2))
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
