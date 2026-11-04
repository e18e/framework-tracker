import { frameworks } from '@framework-tracker/results/frameworks'

export type ThemedValue = { dark: string; light?: string }
export type FrameworkLogo = ThemedValue

export interface FrameworkBrand {
  logo: FrameworkLogo
  color?: ThemedValue
}

export const frameworkBrands: Record<string, FrameworkBrand> = {
  'baseline-html': { logo: { dark: '/framework-logos/html5.svg' } },
  astro: {
    logo: {
      dark: '/framework-logos/astro-gradient.svg',
      light: '/framework-logos/astro-dark.svg',
    },
    color: { dark: '#BC52EE' },
  },
  next: {
    logo: {
      dark: '/framework-logos/nextdotjs-light.svg',
      light: '/framework-logos/nextdotjs.svg',
    },
    color: { dark: '#FFFFFF', light: '#000000' },
  },
  nuxt: {
    logo: { dark: '/framework-logos/nuxt.svg' },
    color: { dark: '#00DC82' },
  },
  pracht: {
    logo: { dark: '/framework-logos/pracht.svg' },
    color: { dark: '#FBBF24' },
  },
  'react-router': {
    logo: { dark: '/framework-logos/reactrouter.svg' },
    color: { dark: '#CA4245' },
  },
  'solid-start': {
    logo: { dark: '/framework-logos/solid-start.svg' },
    color: { dark: '#15ABFF', light: '#0084CE' },
  },
  sveltekit: {
    logo: { dark: '/framework-logos/svelte.svg' },
    color: { dark: '#FF3E00' },
  },
  tanstack: {
    logo: { dark: '/framework-logos/tanstack.svg' },
    color: { dark: '#FFA05C' },
  },
  // Not benchmarked, but shown in the Core Web Vitals charts.
  gatsby: { logo: { dark: '/framework-logos/gatsby.svg' } },
  wordpress: { logo: { dark: '/framework-logos/wordpress.svg' } },
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
