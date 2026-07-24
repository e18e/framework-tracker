import type { ChartValueFormat } from './types'

export function formatChartValue(value: number, format: ChartValueFormat) {
  if (format === 'count') return String(Math.round(value))
  if (format === 'mb') return `${value.toFixed(2)} MB`
  if (format === 'kb') return `${value.toFixed(2)} KB`
  if (format === 's') return `${value.toFixed(2)}s`
  return `${value.toFixed(2)} ms`
}

export function getComparisonChartHeight(itemCount: number) {
  return Math.max(240, itemCount * 56 + 24)
}
