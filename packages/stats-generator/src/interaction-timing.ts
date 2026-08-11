import { NavigationInsights } from 'lighthouse/core/computed/navigation-insights.js'
import type { Artifacts, Result } from 'lighthouse'
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
 *
 * TODO: When Chrome or Lighthouse is bumped, capture repeated Astro and Mastro native-navigation traces.
 * Remove this normalization if Chrome no longer emits sub-1ms preliminary durations, or if Lighthouse no longer
 * rejects Event Timing start records whose preliminary duration is below 1 ms.
 */
export function prepareInteractionTraceForLighthouse(trace: unknown): number {
  const traceEvents = (trace as LighthouseTrace | undefined)?.traceEvents ?? []
  let changed = 0

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
      changed++
    }
  }

  return changed
}

type NavigationArtifacts = Pick<Artifacts, 'Trace' | 'SourceMaps' | 'HostDPR'>

/**
 * Reads the INP breakdown from the insight set for the exact audited navigation.
 * Lighthouse's generic insight audit adapter currently selects the first insight set with a navigation ID instead
 * of matching that ID to the audited navigation. NavigationInsights performs the intended exact-ID lookup.
 * https://github.com/GoogleChrome/lighthouse/blob/main/core/audits/insights/insight-audit.js
 *
 * TODO: On each Lighthouse bump, check whether getInsightSet() now compares the insight-set navigation ID with
 * processedTrace.timeOriginEvt.args.data.navigationId. Once it does, remove this helper and read
 * inp-breakdown-insight through getInteractionTimingFromLighthouse() for native-navigation runs too.
 */
export async function getNavigationInteractionTimingFromLighthouse(
  artifacts: NavigationArtifacts,
  settings: Result['configSettings'],
): Promise<InteractionTiming | null> {
  const insights = await NavigationInsights.request(
    {
      trace: artifacts.Trace,
      settings,
      SourceMaps: artifacts.SourceMaps,
      HostDPR: artifacts.HostDPR,
    },
    { computedCache: new Map() },
  )
  const event = insights.model.INPBreakdown?.longestInteractionEvent
  if (!event) return null

  return getInteractionTimingFromPhases(
    event.inputDelay / 1000,
    event.mainThreadHandling / 1000,
    event.presentationDelay / 1000,
  )
}

function getInteractionTimingFromPhases(
  inputDelayMs: number | undefined,
  processingDurationMs: number | undefined,
  presentationDelayMs: number | undefined,
): InteractionTiming | null {
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

  if (interactionLatencyMs <= 0) return null

  return {
    interactionLatencyMs,
    inputDelayMs,
    processingDurationMs,
    presentationDelayMs,
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

  return getInteractionTimingFromPhases(
    inputDelayMs,
    processingDurationMs,
    presentationDelayMs,
  )
}
