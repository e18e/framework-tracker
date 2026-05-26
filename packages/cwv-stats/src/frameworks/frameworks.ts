export const frameworks = ['Svelte', 'Next.js'] as const

export type Framework = (typeof frameworks)[number]
