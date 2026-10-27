import { isDeepStrictEqual } from 'node:util'
import { VARIANCE_THRESHOLD_PERCENT } from './measurements.ts'
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

function benchmarkConfiguration(value: unknown) {
  const object = record(value)
  if (!object) return undefined
  const keys = [
    'name',
    'configuration',
    'source',
    'path',
    'durationMs',
    'warmupDurationMs',
    'minimumSamples',
    'warmupMinimumSamples',
    'bodySizeKb',
    'duplicationFactor',
  ]
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
        test === 'clientSideRenderedTests' || test === 'serverSideRenderedTests'
      const comparable =
        sameVersion &&
        baseline &&
        current.runner === previous?.runner &&
        (!browserTest || current.browserVersion === previous?.browserVersion) &&
        isDeepStrictEqual(
          benchmarkConfiguration(value),
          benchmarkConfiguration(oldValue),
        )
      summary.variance = {
        comparedToMeasuredAt: comparable
          ? (previous?.timingMeasuredAt ?? null)
          : null,
        meanPercent: comparable
          ? percentageChange(summary.mean, baseline.mean)
          : 0,
        medianPercent: comparable
          ? percentageChange(summary.median, baseline.median)
          : 0,
        minPercent: comparable
          ? percentageChange(summary.min, baseline.min)
          : 0,
        maxPercent: comparable
          ? percentageChange(summary.max, baseline.max)
          : 0,
      }
    }
  }
  return result
}

export function needsBenchmarkRerun(metric: MetricBase): boolean {
  return (
    // Preserve the inclusive boundary despite floating-point arithmetic (0.9 vs 1).
    Math.abs(metric.variance?.meanPercent ?? 0) >=
    VARIANCE_THRESHOLD_PERCENT - Number.EPSILON * 100
  )
}
