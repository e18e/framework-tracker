import type { TimeStat } from './types.ts'

function round(value: number, decimalPlaces: number): number {
  const factor = 10 ** decimalPlaces
  return Math.round(value * factor) / factor
}

export function summarizeSamples(
  samplesMs: number[],
  decimalPlaces = 2,
): TimeStat {
  if (samplesMs.length === 0) {
    throw new Error('Cannot summarize an empty sample set')
  }

  const avgMs =
    samplesMs.reduce((sum, value) => sum + value, 0) / samplesMs.length
  const variance =
    samplesMs.length === 1
      ? 0
      : samplesMs.reduce((sum, value) => sum + (value - avgMs) ** 2, 0) /
        (samplesMs.length - 1)

  return {
    avgMs: round(avgMs, decimalPlaces),
    standardDeviationMs: round(Math.sqrt(variance), decimalPlaces),
    minMs: Math.min(...samplesMs),
    maxMs: Math.max(...samplesMs),
    samplesMs: [...samplesMs],
  }
}

export function standardDeviation(
  samples: number[],
  decimalPlaces = 2,
): number {
  return summarizeSamples(samples, decimalPlaces).standardDeviationMs
}
