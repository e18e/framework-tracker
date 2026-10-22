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

export function getComparisonChartHeight(itemCount: number) {
  return Math.max(240, itemCount * 56 + 24)
}

const FRAMEWORK_LOGO_SOURCES: Record<string, string> = {
  Astro: '/framework-logos/astro-gradient.svg',
  'Baseline HTML': '/framework-logos/html5.svg',
  Gatsby: '/framework-logos/gatsby.svg',
  'Next.js': '/framework-logos/nextdotjs.svg',
  Nuxt: '/framework-logos/nuxt.svg',
  'Nuxt.js': '/framework-logos/nuxt.svg',
  Pracht: '/framework-logos/pracht.svg',
  'React Router': '/framework-logos/reactrouter.svg',
  SolidStart: '/framework-logos/solid-start.svg',
  SvelteKit: '/framework-logos/svelte.svg',
  'TanStack Start': '/framework-logos/tanstack.svg',
  WordPress: '/framework-logos/wordpress.svg',
}

export function getFrameworkLogoSource(name: string) {
  if (name === 'Astro' && document.documentElement.dataset.theme === 'light') {
    return '/framework-logos/astro-dark.svg'
  }

  if (
    name === 'Next.js' &&
    document.documentElement.dataset.theme !== 'light'
  ) {
    return '/framework-logos/nextdotjs-light.svg'
  }

  return FRAMEWORK_LOGO_SOURCES[name]
}
