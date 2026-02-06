import { defineCollection, z } from 'astro:content'

const timeSchema = z.object({
  avgMs: z.number(),
  minMs: z.number(),
  maxMs: z.number(),
})

const devtimeCollection = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    type: z.string(),
    package: z.string(),
    prodDependencies: z.number(),
    devDependencies: z.number(),
    installTime: timeSchema,
    coldBuildTime: timeSchema,
    warmBuildTime: timeSchema,
    buildOutputSize: z.number(),
    nodeModulesSize: z.number(),
    nodeModulesSizeProdOnly: z.number(),
    timingMeasuredAt: z.string(),
    runner: z.string(),
    frameworkVersion: z.string().optional(),
  }),
})

const runtimeCollection = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    type: z.string(),
    package: z.string(),
    ssrOpsPerSec: z.number(),
    ssrAvgLatencyMs: z.number(),
    ssrSamples: z.number(),
    ssrBodySizeKb: z.number(),
    ssrDuplicationFactor: z.number(),
  }),
})

export const collections = {
  devtime: devtimeCollection,
  runtime: runtimeCollection,
}
