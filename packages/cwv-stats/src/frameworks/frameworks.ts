export const frameworks = [
  'Next.js',
  'SolidStart',
  'Astro',
  'Nuxt.js',
  'SvelteKit',
  'React Router',
] as const

export type Framework = (typeof frameworks)[number]

export const frameworkMetadata = {
  'Next.js': { name: 'Next.js', package: 'app-next-js' },
  SolidStart: { name: 'SolidStart', package: 'app-solid-start' },
  Astro: { name: 'Astro', package: 'app-astro' },
  'Nuxt.js': { name: 'Nuxt', package: 'app-nuxt' },
  SvelteKit: { name: 'SvelteKit', package: 'app-sveltekit' },
  'React Router': { name: 'React Router', package: 'app-react-router' },
} as const satisfies Record<
  Framework,
  { name: string; package: `app-${string}` }
>

export type FrameworkName = (typeof frameworkMetadata)[Framework]['name']
export type FrameworkPackage = (typeof frameworkMetadata)[Framework]['package']
