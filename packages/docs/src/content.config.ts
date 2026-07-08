import { defineCollection } from 'astro:content'
import { file, glob } from 'astro/loaders'
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
    browserBaselineTests: z
      .object({
        baselineStatus: z.union([
          z.literal('high'),
          z.literal('low'),
          z.literal(false),
          z.null(),
        ]),
        baselineYear: z.number().nullable(),
        baselineReason: z.string().nullable(),
        baselineFeatureCount: z.number(),
      })
      .optional(),
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
    ssrLoadTests: z
      .object({
        peakWorkers: z.number(),
        peakRequestsPerSec: z.number(),
        peakAvgLatencyMs: z.number(),
        peakP50LatencyMs: z.number(),
        peakP75LatencyMs: z.number(),
        peakP90LatencyMs: z.number(),
        peakP99LatencyMs: z.number(),
        totalRequests: z.number(),
        totalErrors: z.number(),
        stages: z.array(
          z.object({
            workers: z.number(),
            durationMs: z.number(),
            requests: z.number(),
            errors: z.number(),
            requestsPerSec: z.number(),
            avgLatencyMs: z.number(),
            medianLatencyMs: z.number(),
            p50LatencyMs: z.number(),
            p75LatencyMs: z.number(),
            p90LatencyMs: z.number(),
            p99LatencyMs: z.number(),
            maxLatencyMs: z.number(),
            bytesPerSec: z.number(),
          }),
        ),
      })
      .optional(),
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

const cwvCollection = defineCollection({
  loader: file('src/content/cwv/cwv-stats.json'),
  schema: z.object({
    id: z.string(),
    framework: z.string(),
    date: z.string(),
    overall: z.object({
      mobile: z.number(),
      desktop: z.number(),
    }),
    lcp: z.object({
      mobile: z.number(),
      desktop: z.number(),
    }),
    cls: z.object({
      mobile: z.number(),
      desktop: z.number(),
    }),
    fcp: z.object({
      mobile: z.number(),
      desktop: z.number(),
    }),
    ttfb: z.object({
      mobile: z.number(),
      desktop: z.number(),
    }),
    inp: z.object({
      mobile: z.number(),
      desktop: z.number(),
    }),
  }),
})

export const collections = {
  devtime: devtimeCollection,
  runtime: runtimeCollection,
  cwv: cwvCollection,
}
