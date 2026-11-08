import type { BrandVariant, ThemedValue } from './framework-logos'

export interface BrandStyle {
  color: ThemedValue
  variant: BrandVariant
}

export type BrandOverrides = Record<string, Partial<BrandStyle>>

export const BRAND_THEME_EVENT = 'ft:brand-theme-change'
const STORAGE_KEY = 'ft-brand-overrides'

let overrides: BrandOverrides = load()

function load(): BrandOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as BrandOverrides) : {}
  } catch {
    return {}
  }
}

function commit(next: BrandOverrides) {
  overrides = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  } catch {
    // Storage unavailable: overrides still apply for this page view.
  }
  document.dispatchEvent(new CustomEvent(BRAND_THEME_EVENT))
}

export function getBrandOverrides(): BrandOverrides {
  return overrides
}

export function setBrandOverride(key: string, patch: Partial<BrandStyle>) {
  const current = overrides[key] ?? {}
  commit({
    ...overrides,
    [key]: {
      ...current,
      ...patch,
      ...(patch.color && { color: { ...current.color, ...patch.color } }),
    },
  })
}

/** Replaces every override at once, e.g. when pasting a copied config. */
export function replaceBrandOverrides(next: BrandOverrides) {
  commit(next)
}

export function resetBrandOverrides() {
  commit({})
}

/** The configured style for `brandKey` with any live overrides applied. */
export function applyBrandOverrides(
  brandKey: string | null,
  base: BrandStyle,
): BrandStyle {
  const override = brandKey == null ? undefined : overrides[brandKey]
  if (!override) return base
  return {
    color: { ...base.color, ...override.color },
    variant: override.variant ?? base.variant,
  }
}

export function onBrandThemeChange(callback: () => void) {
  document.addEventListener(BRAND_THEME_EVENT, callback)
}
