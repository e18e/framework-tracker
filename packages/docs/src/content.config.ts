import { defineCollection } from 'astro:content'
import { file, glob } from 'astro/loaders'
import { docsLoader } from '@astrojs/starlight/loaders'
import { docsSchema } from '@astrojs/starlight/schema'
import { z } from 'astro/zod'

const timeSchema = z.object({
  avgMs: z.number(),
  standardDeviationMs: z.number().nonnegative().optional(),
  minMs: z.number(),
  maxMs: z.number(),
  samplesMs: z.array(z.number()).nonempty().optional(),
})

const interactionTimingSchema = z.object({
  interactionLatencyMs: z.number().nonnegative(),
  inputDelayMs: z.number().nonnegative(),
  processingDurationMs: z.number().nonnegative(),
  presentationDelayMs: z.number().nonnegative(),
})

const renderedTestSampleSchema = z.object({
  firstPaintMs: z.number().positive(),
  fcpMs: z.number().positive(),
  interactionTests: interactionTimingSchema,
})

const dependencyStatsSchema = z.object({
  prodDependencies: z.number().int().nonnegative(),
  devDependencies: z.number().int().nonnegative(),
  allDependencies: z.number().int().nonnegative(),
})

const devtimeSchema = z.object({
  name: z.string(),
  type: z.string(),
  package: z.string(),
  isFocused: z.boolean(),
  order: z.number(),
  prodDependencies: z.number(),
  devDependencies: z.number(),
  allDependencies: z.number(),
  frameworkDependencies: dependencyStatsSchema.optional(),
  installTime: timeSchema,
  coldBuildTime: timeSchema,
  warmBuildTime: timeSchema,
  buildOutputSize: z.number(),
  nodeModulesSize: z.number(),
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
  browserVersion: z.string().optional(),
  frameworkVersion: z.string().optional(),
})

const runtimeSchema = z.object({
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
  clientSideRenderedTests: z
    .object({
      firstPaintMs: z.number(),
      fcpMs: z.number(),
      inpMs: z.number().optional(),
      interactionTests: z
        .object({
          scenario: z.literal('first-row-detail-navigation'),
          source: z.literal('lighthouse-inp-breakdown'),
          interactionLatencyMs: z.number().positive(),
          inputDelayMs: z.number().nonnegative(),
          processingDurationMs: z.number().nonnegative(),
          presentationDelayMs: z.number().nonnegative(),
        })
        .optional(),
      runs: z.number(),
      standardDeviation: interactionTimingSchema
        .extend({
          firstPaintMs: z.number().nonnegative(),
          fcpMs: z.number().nonnegative(),
        })
        .optional(),
      samples: z.array(renderedTestSampleSchema).nonempty().optional(),
    })
    .optional(),
  serverSideRenderedTests: z
    .object({
      firstPaintMs: z.number(),
      fcpMs: z.number(),
      inpMs: z.number().optional(),
      interactionTests: z
        .object({
          scenario: z.literal('first-row-detail-navigation'),
          source: z.literal('lighthouse-inp-breakdown'),
          interactionLatencyMs: z.number().positive(),
          inputDelayMs: z.number().nonnegative(),
          processingDurationMs: z.number().nonnegative(),
          presentationDelayMs: z.number().nonnegative(),
        })
        .optional(),
      runs: z.number(),
      standardDeviation: interactionTimingSchema
        .extend({
          firstPaintMs: z.number().nonnegative(),
          fcpMs: z.number().nonnegative(),
        })
        .optional(),
      samples: z.array(renderedTestSampleSchema).nonempty().optional(),
    })
    .optional(),
  timingMeasuredAt: z.string().optional(),
  runner: z.string().optional(),
  browserVersion: z.string().optional(),
  frameworkVersion: z.string().optional(),
})

const devtimeCollection = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/devtime' }),
  schema: devtimeSchema,
})

const devtimeVersionsCollection = defineCollection({
  loader: glob({
    pattern: '**/*.json',
    base: './src/content/devtime/versions',
  }),
  schema: devtimeSchema,
})

const runtimeCollection = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/runtime' }),
  schema: runtimeSchema,
})

const runtimeVersionsCollection = defineCollection({
  loader: glob({
    pattern: '**/*.json',
    base: './src/content/runtime/versions',
  }),
  schema: runtimeSchema,
})

const cwvCollection = defineCollection({
  loader: file('src/content/cwv/cwv-stats.json'),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    package: z.string(),
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

const docsCollection: ReturnType<typeof defineCollection> = defineCollection({
  loader: docsLoader(),
  schema: docsSchema(),
})

export const collections = {
  docs: docsCollection,
  devtime: devtimeCollection,
  devtimeVersions: devtimeVersionsCollection,
  runtime: runtimeCollection,
  runtimeVersions: runtimeVersionsCollection,
  cwv: cwvCollection,
}
