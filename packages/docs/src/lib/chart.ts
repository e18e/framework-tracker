import { getBrandByDisplayName, resolveThemedValue } from './framework-logos'
import type { ChartValueFormat } from './types'

export function formatChartValue(
  value: number,
  format: ChartValueFormat,
  prefixPositive?: boolean,
) {
  let formatted: string
  switch (format) {
    case 'count':
      formatted = String(Math.round(value))
      break
    case 'mb':
      formatted = `${value.toFixed(2)} MB`
      break
    case 'kb':
      formatted = `${value.toFixed(2)} KB`
      break
    case 's':
      formatted = `${value.toFixed(2)}s`
      break
    default:
      formatted = `${value.toFixed(2)} ms`
  }
  return prefixPositive && value > 0 ? `+${formatted}` : formatted
}

/** Every comparison chart shares one height so they line up on the page. */
export const COMPARISON_CHART_HEIGHT = 480

/** Browser-only: resolves the logo for the page's current theme. */
export function getFrameworkLogoSource(name: string) {
  const brand = getBrandByDisplayName(name)
  return brand == null
    ? undefined
    : resolveThemedValue(brand.logo, document.documentElement.dataset.theme)
}
