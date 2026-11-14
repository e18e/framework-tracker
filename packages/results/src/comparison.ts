import { isDeepStrictEqual } from 'node:util'
import {
  MetricBaseSchema,
  type FrameworkResult,
  type MetricBase,
} from './schemas.ts'

function percentageChange(current: number, previous: number): number {
  if (previous === 0) return 0
  const change = ((current - previous) / previous) * 100
  return Number.isFinite(change) ? change : 0
}

function metricChange(current: number, previous: number) {
  return {
    percentChange: percentageChange(current, previous),
    valueChange: current - previous,
  }
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

export function metricSummaries(
  value: unknown,
  prefix = '',
): Map<string, MetricBase> {
  const summaries = new Map<string, MetricBase>()
  const object = record(value)
  if (!object) return summaries
  const metric = MetricBaseSchema.safeParse(object)
  if (metric.success) {
    summaries.set(prefix, value as MetricBase)
    return summaries
  }
  for (const [key, child] of Object.entries(object)) {
    if (key === 'variance' || key === 'iterations') continue
    for (const [path, summary] of metricSummaries(
      child,
      prefix ? `${prefix}.${key}` : key,
    ))
      summaries.set(path, summary)
  }
  return summaries
}

function benchmarkIdentity(value: unknown) {
  const object = record(value)
  if (!object) return undefined
  const keys = ['name', 'bodySize', 'duplicationFactor']
  return Object.fromEntries(
    keys.filter((key) => key in object).map((key) => [key, object[key]]),
  )
}

export function withSummaryVariance(
  current: FrameworkResult,
  previous: FrameworkResult | null,
  measuredTests = Object.keys(current),
): FrameworkResult {
  const result = structuredClone(current)
  const currentRecord = result as Record<string, unknown>
  const previousRecord = previous as Record<string, unknown> | null
  const measured = new Set(measuredTests)
  const sameVersion =
    Boolean(current.frameworkVersion) &&
    current.frameworkVersion !== 'unknown' &&
    current.frameworkVersion === previous?.frameworkVersion

  for (const [test, value] of Object.entries(currentRecord)) {
    const summaries = metricSummaries(value)
    const oldValue = previousRecord?.[test]
    const oldSummaries = metricSummaries(oldValue)
    for (const [path, summary] of summaries) {
      delete summary.variance
      if (!measured.has(test)) continue
      const baseline = oldSummaries.get(path)
      const browserTest =
        test === 'clientSideRendered' || test === 'serverSideRendered'
      const comparable =
        sameVersion &&
        baseline &&
        summary.unit === baseline.unit &&
        current.runner === previous?.runner &&
        (!browserTest || current.browserVersion === previous?.browserVersion) &&
        isDeepStrictEqual(benchmarkIdentity(value), benchmarkIdentity(oldValue))
      if (!comparable) continue
      summary.variance = {
        comparedToMeasuredAt: previous?.timingMeasuredAt ?? null,
        mean: metricChange(summary.mean, baseline.mean),
        median: metricChange(summary.median, baseline.median),
        min: metricChange(summary.min, baseline.min),
        max: metricChange(summary.max, baseline.max),
      }
    }
  }
  return result
}
