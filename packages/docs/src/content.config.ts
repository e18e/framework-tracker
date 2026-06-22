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
    depInstallSize: z.number().optional(),
    e18eMessages: z
      .array(
        z.object({
          severity: z.string(),
          message: z.string(),
          fixableBy: z.string().optional(),
        }),
      )
      .optional(),
    vendoredCoreJsSize: z.number().optional(),
    vendoredCoreJsUnnecessaryModules: z.array(z.string()).optional(),
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
    ssrRequestThroughputTests: z.object({
      opsPerSec: z.number(),
      avgLatencyMs: z.number(),
      medianLatencyMs: z.number(),
      samples: z.number(),
      bodySizeKb: z.number(),
      duplicationFactor: z.number(),
    }),
    // Client-side rendered paint + interaction metrics
    clientSideRenderedTests: z
      .object({
        firstPaintMs: z.number(),
        fcpMs: z.number(),
        inpMs: z.number(),
        runs: z.number(),
      })
      .optional(),

    // Server-side rendered route paint + interaction metrics
    serverSideRenderedTests: z
      .object({
        firstPaintMs: z.number(),
        fcpMs: z.number(),
        inpMs: z.number(),
        runs: z.number(),
      })
      .optional(),
  }),
})

export const collections = {
  devtime: devtimeCollection,
  runtime: runtimeCollection,
}
