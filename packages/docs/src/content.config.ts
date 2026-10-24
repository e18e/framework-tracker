import {
  DependencyCountsSchema,
  FirstPartyDependencyScanSchema,
  BrowserBaselineStatsSchema,
  InteractionTimingSchema as interactionTimingSchema,
  RenderedTestSampleSchema as renderedTestSampleSchema,
  BuildBenchmarkSchema,
  DevServerBenchmarkSchema,
  InstallBenchmarkSchema,
  ClientRenderingBenchmarkSchema,
  ServerRenderingBenchmarkSchema,
  SSRLoadTestsSchema,
} from '@framework-tracker/results'
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
  BuildBenchmarkSchema.transform((value) => ({
    avgMs: value.timeMs.mean,
    medianMs: value.timeMs.median,
    minMs: value.timeMs.min,
    maxMs: value.timeMs.max,
    samplesMs: value.iterations.map((run) => run.timeMs),
  })),
  timeSchema,
])

const devServerTimeSchema = z.union([
  DevServerBenchmarkSchema.transform((value) => ({
    avgMs: value.timeMs.mean,
    medianMs: value.timeMs.median,
    minMs: value.timeMs.min,
    maxMs: value.timeMs.max,
    samplesMs: value.iterations.map((run) => run.timeMs),
  })),
  timeSchema,
])

const dependencyStatsSchema = DependencyCountsSchema
const firstPartyDependencyStatsSchema = FirstPartyDependencyScanSchema.omit({
  name: true,
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
  install: InstallBenchmarkSchema,
  coldBuildTime: buildTimeSchema,
  warmBuildTime: buildTimeSchema,
  devServerStartTime: devServerTimeSchema.optional(),
  duplicateDependencies: z.number().optional(),
  depInstallSize: z.number().optional(),
  vendoredCoreJsSize: z.number().optional(),
  vendoredCoreJsUnnecessaryModules: z.array(z.string()).optional(),
  browserBaselineTests: BrowserBaselineStatsSchema.omit({
    name: true,
  }).optional(),
  minimumNodeVersion: z.string().optional(),
  minimumNodeVersionImposedBy: z.array(z.string()).optional(),
  timingMeasuredAt: z.string(),
  runner: z.string(),
  browserVersion: z.string().optional(),
  frameworkVersion: z.string().optional(),
  releasedAt: z.string().optional(),
})

const ssrLoadTestsSchema = SSRLoadTestsSchema.transform((value) => {
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
