import type { MetricBase } from './schemas.ts'
import type { TimeStat } from './types.ts'

function round(value: number, decimalPlaces: number): number {
  const factor = 10 ** decimalPlaces
  return Math.round(value * factor) / factor
}

export function summarizeSamples(
  samplesMs: number[],
  decimalPlaces = 2,
): TimeStat {
  const metric = summarizeMetric(samplesMs)

  return {
    avgMs: round(metric.mean, decimalPlaces),
    standardDeviationMs: round(Math.sqrt(metric.variance), decimalPlaces),
    minMs: metric.min,
    maxMs: metric.max,
    samplesMs: [...samplesMs],
  }
}

export function standardDeviation(
  samples: number[],
  decimalPlaces = 2,
): number {
  return summarizeSamples(samples, decimalPlaces).standardDeviationMs
}

export function summarizeMetric(values: number[]): MetricBase {
  if (values.length === 0)
    throw new Error('Cannot summarize an empty sample set')
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  let min = values[0]
  let max = values[0]
  for (const value of values) {
    if (value < min) min = value
    if (value > max) max = value
  }
  const sorted = values.toSorted((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  const median =
    sorted.length % 2 === 1
      ? sorted[middle]
      : sorted[middle - 1] / 2 + sorted[middle] / 2
  return {
    mean,
    median,
    min,
    max,
    variance:
      values.length === 1
        ? 0
        : values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
          (values.length - 1),
  }
}
