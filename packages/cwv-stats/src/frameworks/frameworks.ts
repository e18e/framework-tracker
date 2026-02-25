export const frameworks = ['REACT', 'NEXT.JS'] as const

export type Framework = (typeof frameworks)[number]
