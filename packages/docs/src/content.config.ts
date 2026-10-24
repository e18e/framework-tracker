import { requestThroughputContentSchema } from './lib/request-throughput'
import { defineCollection } from 'astro:content'
import { file, glob } from 'astro/loaders'
import { docsLoader } from '@astrojs/starlight/loaders'
import { docsSchema } from '@astrojs/starlight/schema'
import { z } from 'astro/zod'
import { readdirSync } from 'node:fs'

const timeSchema = z.object({
  avgMs: z.number(),
  medianMs: z.number().optional(),
  standardDeviationMs: z.number().nonnegative().optional(),
  minMs: z.number(),
  maxMs: z.number(),
  samplesMs: z.array(z.number()).nonempty().optional(),
})

const buildTimeSchema = z.union([
  z
    .object({
      name: z.enum(['coldBuild', 'warmBuild']),
      runs: z.number().int().positive(),
      iterations: z.array(z.object({ timeMs: z.number().nonnegative() })),
      timeMs: z.object({
        mean: z.number(),
        median: z.number(),
        min: z.number(),
        max: z.number(),
      }),
    })
    .refine((value) => value.iterations.length === value.runs)
    .transform((value) => ({
      avgMs: value.timeMs.mean,
      medianMs: value.timeMs.median,
      minMs: value.timeMs.min,
      maxMs: value.timeMs.max,
      samplesMs: value.iterations.map((run) => run.timeMs),
    })),
  timeSchema,
])

const devServerTimeSchema = z.union([
  z
    .object({
      name: z.literal('devServer'),
      runs: z.number().int().positive(),
      iterations: z.array(z.object({ timeMs: z.number().nonnegative() })),
      timeMs: z.object({
        mean: z.number(),
        median: z.number(),
        min: z.number(),
        max: z.number(),
      }),
    })
    .refine((value) => value.iterations.length === value.runs)
    .transform((value) => ({
      avgMs: value.timeMs.mean,
      medianMs: value.timeMs.median,
      minMs: value.timeMs.min,
      maxMs: value.timeMs.max,
      samplesMs: value.iterations.map((run) => run.timeMs),
    })),
  timeSchema,
])

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

const metricSchema = z.object({
  mean: z.number(),
  median: z.number(),
  min: z.number(),
  max: z.number(),
})
const ClientRenderingBenchmarkSchema = z
  .object({
    name: z.literal('clientSideRendered'),
    runs: z.number().int().positive(),
    iterations: z.array(renderedTestSampleSchema),
    firstPaintMs: metricSchema,
    fcpMs: metricSchema,
    interactionTests: z.object({
      scenario: z.literal('first-row-detail-navigation'),
      source: z.literal('lighthouse-inp-breakdown'),
      interactionLatencyMs: metricSchema,
      inputDelayMs: metricSchema,
      processingDurationMs: metricSchema,
      presentationDelayMs: metricSchema,
    }),
  })
  .refine((value) => value.iterations.length === value.runs)

const ServerRenderingBenchmarkSchema = z
  .object({
    name: z.literal('serverSideRendered'),
    runs: z.number().int().positive(),
    iterations: z.array(renderedTestSampleSchema),
    firstPaintMs: metricSchema,
    fcpMs: metricSchema,
    interactionTests: z.object({
      scenario: z.literal('first-row-detail-navigation'),
      source: z.literal('lighthouse-inp-breakdown'),
      interactionLatencyMs: metricSchema,
      inputDelayMs: metricSchema,
      processingDurationMs: metricSchema,
      presentationDelayMs: metricSchema,
    }),
  })
  .refine((value) => value.iterations.length === value.runs)

const dependencyStatsSchema = z.object({
  prodDependencies: z.number().int().nonnegative(),
  devDependencies: z.number().int().nonnegative(),
  allDependencies: z.number().int().nonnegative(),
})

const firstPartyDependencyStatsSchema = dependencyStatsSchema.extend({
  duplicateDependencies: z.number().int().nonnegative().optional(),
})

const devtimeSchema = z.object({
  framework: z.string(),
  packagePath: z.string(),
  name: z.string(),
  type: z.string(),
  package: z.string(),
  isFocused: z.boolean(),
  order: z.number(),
  prodDependencies: z.number(),
  devDependencies: z.number(),
  allDependencies: z.number(),
  firstPartyDependencies: firstPartyDependencyStatsSchema,
  frameworkDependencies: dependencyStatsSchema.optional(),
  install: z.object({
    name: z.literal('install'),
    runs: z.number().int().positive(),
    iterations: z.array(z.object({ installTimeMs: z.number().nonnegative() })),
    installTimeMs: z.object({
      mean: z.number(),
      median: z.number(),
      min: z.number(),
      max: z.number(),
    }),
    nodeModulesSizeBytes: z.number().nonnegative(),
  }),
  coldBuildTime: buildTimeSchema,
  warmBuildTime: buildTimeSchema,
  devServerStartTime: devServerTimeSchema.optional(),
  duplicateDependencies: z.number().optional(),
  depInstallSize: z.number().optional(),
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
  minimumNodeVersion: z.string().optional(),
  minimumNodeVersionImposedBy: z.array(z.string()).optional(),
  timingMeasuredAt: z.string(),
  runner: z.string(),
  browserVersion: z.string().optional(),
  frameworkVersion: z.string().optional(),
  releasedAt: z.string().optional(),
})

const ssrLoadStageSchema = z.object({
  workers: z.number().int().positive(),
  elapsedTimeMs: z.number().positive(),
  requests: z.number().int().nonnegative(),
  errors: z.number().int().nonnegative(),
  requestsPerSec: z.number().nonnegative(),
  avgLatencyMs: z.number().nonnegative(),
  p50LatencyMs: z.number().nonnegative(),
  p75LatencyMs: z.number().nonnegative(),
  p90LatencyMs: z.number().nonnegative(),
  p99LatencyMs: z.number().nonnegative(),
  maxLatencyMs: z.number().nonnegative(),
  bytesPerSec: z.number().nonnegative(),
})

const ssrLoadSweepSchema = z.array(ssrLoadStageSchema).nonempty()

const ssrLoadStageSummarySchema = z.object({
  connections: z.number().int().positive(),
  requests: metricSchema,
  errors: metricSchema,
  requestsPerSec: metricSchema,
  avgLatencyMs: metricSchema,
  p50LatencyMs: metricSchema,
  p75LatencyMs: metricSchema,
  p90LatencyMs: metricSchema,
  p99LatencyMs: metricSchema,
  maxLatencyMs: metricSchema,
  bytesPerSec: metricSchema,
})

const ssrLoadTestsSchema = z
  .object({
    name: z.enum(['ssrLoad', 'ssrRouterLinkLoad']),
    runs: z.number().int().positive(),
    iterations: z.array(ssrLoadSweepSchema).nonempty(),
    configuration: z.object({
      workerStages: z.array(z.number().int().positive()).nonempty(),
      warmupDurationMs: z.number().positive().optional(),
      recoveryMs: z.number().nonnegative().optional(),
      warmupAttempts: z.number().int().positive().optional(),
      stageDurationMs: z.number().positive().optional(),
    }),
    representativeIterationIndex: z.number().int().nonnegative(),
    source: z.literal('autocannon'),
    path: z.enum([
      '/server-side-rendered',
      '/server-side-rendered-plain-links',
    ]),
    totalRequests: z.number().int().nonnegative(),
    totalErrors: z.number().int().nonnegative(),
    stage1: ssrLoadStageSummarySchema,
    stage2: ssrLoadStageSummarySchema.optional(),
    stage3: ssrLoadStageSummarySchema.optional(),
    stage4: ssrLoadStageSummarySchema.optional(),
    stage5: ssrLoadStageSummarySchema.optional(),
    stage6: ssrLoadStageSummarySchema.optional(),
    stage7: ssrLoadStageSummarySchema.optional(),
  })
  .refine(
    (value) =>
      value.iterations.length === value.runs &&
      value.representativeIterationIndex < value.iterations.length &&
      value.iterations[value.representativeIterationIndex]!.some(
        (stage) => stage.errors === 0,
      ),
  )
  .transform((value) => {
    const representativeSweep =
      value.iterations[value.representativeIterationIndex]!
    const representativePeak = representativeSweep
      .filter((stage) => stage.errors === 0)
      .reduce((best, stage) =>
        stage.requestsPerSec > best.requestsPerSec ? stage : best,
      )
    return {
      ...value,
      representativeSweep,
      representativePeak,
      stages: [
        value.stage1,
        value.stage2,
        value.stage3,
        value.stage4,
        value.stage5,
        value.stage6,
        value.stage7,
      ].flatMap((stage) =>
        stage
          ? [
              {
                workers: stage.connections,
                requests: stage.requests.mean,
                errors: stage.errors.mean,
                requestsPerSec: stage.requestsPerSec.mean,
                avgLatencyMs: stage.avgLatencyMs.mean,
                p50LatencyMs: stage.p50LatencyMs.mean,
                p75LatencyMs: stage.p75LatencyMs.mean,
                p90LatencyMs: stage.p90LatencyMs.mean,
                p99LatencyMs: stage.p99LatencyMs.mean,
                maxLatencyMs: stage.maxLatencyMs.mean,
                bytesPerSec: stage.bytesPerSec.mean,
              },
            ]
          : [],
      ),
    }
  })

const runtimeSchema = z.object({
  name: z.string(),
  type: z.string(),
  package: z.string(),
  isFocused: z.boolean(),
  order: z.number(),
  ssrRequestThroughputTests: requestThroughputContentSchema,
  ssrLoadTests: ssrLoadTestsSchema
    .refine((value) => value.name === 'ssrLoad')
    .optional(),
  ssrRouterLinkLoadTests: ssrLoadTestsSchema
    .refine((value) => value.name === 'ssrRouterLinkLoad')
    .optional(),
  clientSideRenderedTests: z
    .union([
      ClientRenderingBenchmarkSchema.transform((value) => ({
        ...value,
        firstPaintMs: value.firstPaintMs.mean,
        fcpMs: value.fcpMs.mean,
        interactionTests: {
          ...value.interactionTests,
          interactionLatencyMs:
            value.interactionTests.interactionLatencyMs.mean,
          inputDelayMs: value.interactionTests.inputDelayMs.mean,
          processingDurationMs:
            value.interactionTests.processingDurationMs.mean,
          presentationDelayMs: value.interactionTests.presentationDelayMs.mean,
        },
      })),
      z.object({
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
      }),
    ])
    .optional(),
  serverSideRenderedTests: z
    .union([
      ServerRenderingBenchmarkSchema.transform((value) => ({
        ...value,
        firstPaintMs: value.firstPaintMs.mean,
        fcpMs: value.fcpMs.mean,
        interactionTests: {
          ...value.interactionTests,
          interactionLatencyMs:
            value.interactionTests.interactionLatencyMs.mean,
          inputDelayMs: value.interactionTests.inputDelayMs.mean,
          processingDurationMs:
            value.interactionTests.processingDurationMs.mean,
          presentationDelayMs: value.interactionTests.presentationDelayMs.mean,
        },
      })),
      z.object({
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
      }),
    ])
    .optional(),
  timingMeasuredAt: z.string().optional(),
  runner: z.string().optional(),
  browserVersion: z.string().optional(),
  frameworkVersion: z.string().optional(),
  releasedAt: z.string().optional(),
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
  schema: runtimeSchema.extend({
    ssrRequestThroughputTests:
      runtimeSchema.shape.ssrRequestThroughputTests.optional(),
  }),
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

// Derived from the devtime filenames rather than hardcoded, so adding a
// framework does not silently break every code comparison example.
const frameworkSlugs = new Set(
  readdirSync(new URL('./content/devtime', import.meta.url))
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.replace(/^starter-/, '').replace(/\.json$/, '')),
)

const codeComparisonCollection = defineCollection({
  loader: glob({
    pattern: '**/*',
    base: './src/content/code-comparison',
    generateId: ({ entry }) => {
      const slug = /^[^/]+\/([^/]+)\.md$/.exec(entry)?.[1]
      if (slug == null || !frameworkSlugs.has(slug)) {
        throw new Error(
          `Invalid code comparison file "${entry}". Expected <example>/<framework>.md where <framework> is one of: ${[...frameworkSlugs].join(', ')}.`,
        )
      }
      return entry.replace(/\.md$/, '')
    },
  }),
  schema: z.object({ docs: z.url().optional() }).strict(),
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
  codeComparison: codeComparisonCollection,
}
