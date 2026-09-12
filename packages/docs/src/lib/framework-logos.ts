export type FrameworkLogo = { dark: string; light?: string }

/** Keyed by devtime starter package name. */
export const frameworkLogos: Record<string, FrameworkLogo> = {
  'starter-astro': {
    dark: '/framework-logos/astro-gradient.svg',
    light: '/framework-logos/astro-dark.svg',
  },
  'starter-next-js': {
    dark: '/framework-logos/nextdotjs-light.svg',
    light: '/framework-logos/nextdotjs.svg',
  },
  'starter-nuxt': { dark: '/framework-logos/nuxt.svg' },
  'starter-react-router': { dark: '/framework-logos/reactrouter.svg' },
  'starter-solid-start': { dark: '/framework-logos/solid-start.svg' },
  'starter-sveltekit': { dark: '/framework-logos/svelte.svg' },
  'starter-tanstack-start-react': { dark: '/framework-logos/tanstack.svg' },
}
