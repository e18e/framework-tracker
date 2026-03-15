import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

const timeSchema = z.object({
  avgMs: z.number(),
  minMs: z.number(),
  maxMs: z.number(),
})

const devtimeCollection = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/devtime' }),
  schema: z.object({
    name: z.string(),
    type: z.string(),
    package: z.string(),
    isFocused: z.boolean(),
    order: z.number(),
    prodDependencies: z.number(),
    devDependencies: z.number(),
    installTime: timeSchema,
    coldBuildTime: timeSchema,
    warmBuildTime: timeSchema,
    buildOutputSize: z.number(),
    nodeModulesSize: z.number(),
    nodeModulesSizeProdOnly: z.number(),
    duplicateDependencies: z.number().optional(),
    timingMeasuredAt: z.string(),
    runner: z.string(),
    frameworkVersion: z.string().optional(),
  }),
})

const runtimeCollection = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/runtime' }),
  schema: z.object({
    name: z.string(),
    type: z.string(),
    package: z.string(),
    isFocused: z.boolean(),
    order: z.number(),
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
