import { defineCollection, z } from 'astro:content'

const frameworksCollection = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    package: z.string(),
    supportsSPA: z.boolean(),
    supportsMPA: z.boolean(),
    supportsSSG: z.boolean().optional(),
    recommended: z.string(),
    bundler: z.string(),
    otherBundlers: z.array(z.string()).optional(),
  }),
})

const devtimeCollection = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    type: z.string(),
    package: z.string(),
    prodDependencies: z.number(),
    devDependencies: z.number(),
    avgInstallTimeMs: z.number(),
    minInstallTimeMs: z.number(),
    maxInstallTimeMs: z.number(),
    coldBuildTimeMs: z.number(),
    warmBuildTimeMs: z.number(),
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
  frameworks: frameworksCollection,
  devtime: devtimeCollection,
  runtime: runtimeCollection,
}
