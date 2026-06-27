export const frameworks = [
    'Next.js',
    'SolidStart',
    'Astro',
    'Nuxt.js',
    'SvelteKit',
    'React Router'
] as const

export type Framework = (typeof frameworks)[number]
