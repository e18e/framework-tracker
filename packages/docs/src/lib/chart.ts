import { getBrandByDisplayName, resolveThemedValue } from './framework-logos'
import type { ChartValueFormat } from './types'

export function formatValue(
  value: number,
  format: ChartValueFormat,
  ops?: { prefixPositive?: boolean; sigFigs?: number },
) {
  const { prefixPositive, sigFigs = 0 } = ops ?? {}
  const fixed = value.toFixed(sigFigs)

  let formatted: string
  switch (format) {
    case 'count':
      formatted = String(Math.round(value))
      break
    case 'mb':
      formatted = `${fixed} MB`
      break
    case 'kb':
      formatted = `${fixed} KB`
      break
    case 's':
      formatted = `${fixed}s`
      break
    default:
      formatted = `${fixed} ms`
  }
  return prefixPositive && value > 0 ? `+${formatted}` : formatted
}

/** Every comparison chart shares one height so they don't cause layout shift. */
export const SHARED_CHART_HEIGHT = 480

/** Pixels trimmed from each bar's top and bottom */
export const SHARED_BAR_INSET = 3

/** Browser-only: resolves the logo for the page's current theme. */
export function getFrameworkLogoSource(name: string) {
  const brand = getBrandByDisplayName(name)
  return brand == null
    ? undefined
    : resolveThemedValue(brand.logo, document.documentElement.dataset.theme)
}
