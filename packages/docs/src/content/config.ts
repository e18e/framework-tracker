import { defineCollection, z } from 'astro:content'

const statsCollection = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    type: z.string(),
    prodDependencies: z.number(),
    devDependencies: z.number(),
    package: z.string(),
    installTimeMs: z.number(),
    coldBuildTimeMs: z.number(),
    warmBuildTimeMs: z.number(),
    buildOutputSize: z.number(),
    nodeModulesSize: z.number(),
    nodeModulesSizeProdOnly: z.number(),
    timingMeasuredAt: z.string(),
    runner: z.string(),
  }),
})

export const collections = {
  stats: statsCollection,
}
