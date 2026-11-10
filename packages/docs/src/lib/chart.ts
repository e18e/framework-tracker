import { getBrandByDisplayName, resolveThemedValue } from './framework-logos.ts'

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
