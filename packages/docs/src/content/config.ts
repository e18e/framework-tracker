import { defineCollection, z } from 'astro:content'

const statsCollection = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    prodDependencies: z.number(),
    devDependencies: z.number(),
    npmGraphUrl: z.string().url().optional(),
  }),
})

export const collections = {
  stats: statsCollection,
}
