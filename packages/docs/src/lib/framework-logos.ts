import { frameworks } from '@framework-tracker/results/frameworks'

export type ThemedValue = { dark: string; light?: string }
export type FrameworkLogo = ThemedValue

export type BrandVariant = 'solid' | 'segmented'

export const BRAND_VARIANTS: readonly BrandVariant[] = ['solid', 'segmented']

export interface FrameworkBrand {
  logo: FrameworkLogo
  color: ThemedValue
  variant: BrandVariant
}

export const frameworkBrands: Record<string, FrameworkBrand> = {
  'baseline-html': {
    logo: { dark: '/framework-logos/html5.svg' },
    color: { dark: 'var(--ft-muted)' },
    variant: 'segmented',
  },
  astro: {
    logo: {
      dark: '/framework-logos/astro-gradient.svg',
      light: '/framework-logos/astro-dark.svg',
    },
    color: { dark: '#BC52EE', light: '#8A2BC2' },
    variant: 'solid',
  },
  next: {
    logo: {
      dark: '/framework-logos/nextdotjs-light.svg',
      light: '/framework-logos/nextdotjs.svg',
    },
    color: { dark: '#FFFFFF', light: '#000000' },
    variant: 'solid',
  },
  nuxt: {
    logo: { dark: '/framework-logos/nuxt.svg' },
    color: { dark: '#00DC82', light: '#00A35F' },
    variant: 'solid',
  },
  pracht: {
    logo: { dark: '/framework-logos/pracht.svg' },
    color: { dark: '#FBBF24', light: '#A16207' },
    variant: 'solid',
  },
  'react-router': {
    logo: { dark: '/framework-logos/reactrouter.svg' },
    color: { dark: '#F44250', light: '#CA4245' },
    variant: 'solid',
  },
  solid: {
    logo: { dark: '/framework-logos/solid.svg' },
    color: { dark: '#7A9FD6', light: '#2C4F7C' },
    variant: 'solid',
  },
  'solid-start': {
    logo: { dark: '/framework-logos/solid-start.svg' },
    color: { dark: '#15ABFF', light: '#0084CE' },
    variant: 'solid',
  },
  sveltekit: {
    logo: { dark: '/framework-logos/svelte.svg' },
    color: { dark: '#FF3E00', light: '#E03400' },
    variant: 'solid',
  },
  tanstack: {
    logo: { dark: '/framework-logos/tanstack.svg' },
    color: { dark: '#FFA05C', light: '#D9661A' },
    variant: 'solid',
  },
  // Not benchmarked, but shown in the Core Web Vitals charts.
  gatsby: {
    logo: { dark: '/framework-logos/gatsby.svg' },
    color: { dark: '#A374D5', light: '#663399' },
    variant: 'solid',
  },
  wordpress: {
    logo: { dark: '/framework-logos/wordpress.svg' },
    color: { dark: '#4FA3D9', light: '#21759B' },
    variant: 'solid',
  },
}

const brandKeyByDisplayName = new Map<string, string>([
  ...frameworks.map((f) => [f.displayName, f.name] as const),
  ['Nuxt.js', 'nuxt'],
  ['Gatsby', 'gatsby'],
  ['WordPress', 'wordpress'],
])

const brandKeyByPackage = new Map<string, string>(
  frameworks.flatMap((f) =>
    [f.starter?.package, f.app?.package].flatMap((packageName) =>
      packageName ? [[packageName, f.name] as const] : [],
    ),
  ),
)

export function getBrandByDisplayName(name: string) {
  const key = brandKeyByDisplayName.get(name)
  return key == null ? undefined : frameworkBrands[key]
}

export function getBrandByPackage(packageName: string) {
  const key = brandKeyByPackage.get(packageName)
  return key == null ? undefined : frameworkBrands[key]
}

export function resolveThemedValue(
  value: ThemedValue,
  theme: string | undefined,
) {
  return theme === 'light' ? (value.light ?? value.dark) : value.dark
}

/** Resolves a themed colour, expanding `var(--token)` references for canvas/SVG use. */
export function resolveBrandColor(value: ThemedValue, theme?: string) {
  const color = resolveThemedValue(value, theme)
  const match = /^var\((--[\w-]+)(?:\s*,\s*(.+))?\)$/.exec(color.trim())
  if (!match) return color
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue(match[1]!)
      .trim() ||
    match[2] ||
    '#697586'
  )
}
