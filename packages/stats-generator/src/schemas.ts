import { z } from 'zod'

/** Summary of one metric; units belong to the metric being measured. */
export const MetricBaseSchema = z.object({
  /** Arithmetic mean of this metric across all measured runs. */
  mean: z.number(),
  /** Lowest value observed across the measured runs. */
  min: z.number(),
  /** Highest value observed across the measured runs. */
  max: z.number(),
  /** Sample variance in squared metric units (n - 1 divisor); zero for one run. */
  variance: z.number().nonnegative(),
})
export type MetricBase = z.infer<typeof MetricBaseSchema>

/** Framework identifiers configured in .github/frameworks.json. */
export const FrameworkSchema = z.enum([
  'baseline-html',
  'astro',
  'next',
  'nuxt',
  'pracht',
  'react-router',
  'solid-start',
  'sveltekit',
  'tanstack',
])

/** Tested package folders configured in .github/frameworks.json. */
export const PackagePathSchema = z.enum([
  'packages/app-baseline-html',
  'packages/starter-astro',
  'packages/app-astro',
  'packages/starter-next-js',
  'packages/app-next-js',
  'packages/starter-nuxt',
  'packages/app-nuxt',
  'packages/starter-pracht',
  'packages/app-pracht',
  'packages/starter-react-router',
  'packages/app-react-router',
  'packages/starter-solid-start',
  'packages/app-solid-start',
  'packages/starter-sveltekit',
  'packages/app-sveltekit',
  'packages/starter-tanstack-start-react',
  'packages/app-tanstack-start-react',
])

/** Shared metadata for the overall result document. */
export const BaseResultSchema = z.object({
  framework: FrameworkSchema,
  packagePath: PackagePathSchema,
  timingMeasuredAt: z.iso.datetime(),
  runner: z.string().min(1),
})

/** Identity shared by benchmarks and exact-value scans. */
export const TestBaseSchema = z.object({
  /** Stable test identifier, such as install or ssrLoad. */
  name: z.string().min(1),
})
export type TestBase = z.infer<typeof TestBaseSchema>

/**
 * Repeated benchmark result with benchmark-specific raw iterations.
 * Use safeExtend() to preserve the iteration-count check when adding fields.
 */
export function createBenchmarkBaseSchema<T extends z.ZodType>(iteration: T) {
  return TestBaseSchema.extend({
    /** Number of measured runs contributing to the metrics, excluding warmups. */
    runs: z.number().int().positive(),
    /** Complete raw result for each measured run. */
    iterations: z.array(iteration),
  }).refine((stats) => stats.iterations.length === stats.runs, {
    message: 'Expected one iteration per run',
    path: ['iterations'],
  })
}

const TimeStatSchema = z
  .object({
    avgMs: z.number(),
    standardDeviationMs: z.number().nonnegative().optional(),
    minMs: z.number(),
    maxMs: z.number(),
    samplesMs: z.array(z.number()).nonempty().optional(),
  })
  .refine(
    (stats) =>
      (stats.standardDeviationMs === undefined) ===
      (stats.samplesMs === undefined),
    { message: 'Expected standard deviation and samples together' },
  )

export const InstallIterationSchema = z.object({
  installTimeMs: z.number().nonnegative(),
})

export const InstallBenchmarkSchema = createBenchmarkBaseSchema(
  InstallIterationSchema,
).safeExtend({
  name: z.literal('install'),
  installTimeMs: MetricBaseSchema,
  nodeModulesSizeBytes: z.number().nonnegative(),
})

/** Artifact emitted by the install runner, before overall result assembly. */
export const InstallResultSchema = z.object({
  frameworkVersion: z.string().min(1),
  install: InstallBenchmarkSchema,
})

export const BuildStatsSchema = z.object({
  coldBuildTime: TimeStatSchema,
  warmBuildTime: TimeStatSchema,
})

export const DevServerStatsSchema = z.object({
  devServerStartTime: TimeStatSchema,
})

export const BrowserBaselineStatsSchema = z.object({
  baselineStatus: z.union([
    z.literal('high'),
    z.literal('low'),
    z.literal(false),
    z.null(),
  ]),
  baselineYear: z.number().nullable(),
  baselineReason: z.string().nullable(),
  baselineFeatureCount: z.number().nonnegative(),
})

export const NodeEnginesStatsSchema = z.object({
  minimumNodeVersion: z.string().nullable(),
  imposedBy: z.array(z.string()),
  packagesScanned: z.number().nonnegative(),
  packagesDeclaringNodeEngine: z.number().nonnegative(),
  unsatisfiableRanges: z.array(z.string()),
})

export const SSRRequestThroughputStatsSchema = z.object({
  ssrRequestThroughputTests: z.object({
    opsPerSec: z.number().positive(),
    avgLatencyMs: z.number().nonnegative(),
    medianLatencyMs: z.number().nonnegative(),
    samples: z.number().positive(),
    bodySizeKb: z.number().positive(),
    duplicationFactor: z.number().nonnegative(),
  }),
  frameworkVersion: z.string().optional(),
  timingMeasuredAt: z.string().optional(),
  runner: z.string().optional(),
  browserVersion: z.string().optional(),
})

const SSRLoadSweepSchema = z.object({
  peakWorkers: z.number().positive(),
  peakRequestsPerSec: z.number().positive(),
  peakAvgLatencyMs: z.number().nonnegative(),
  peakP50LatencyMs: z.number().nonnegative(),
  peakP75LatencyMs: z.number().nonnegative(),
  peakP90LatencyMs: z.number().nonnegative(),
  peakP99LatencyMs: z.number().nonnegative(),
  totalRequests: z.number().positive(),
  totalErrors: z.number().nonnegative(),
  stages: z
    .array(
      z.object({
        workers: z.number().positive(),
        durationMs: z.number().positive(),
        requests: z.number().nonnegative(),
        errors: z.number().nonnegative(),
        requestsPerSec: z.number().nonnegative(),
        avgLatencyMs: z.number().nonnegative(),
        medianLatencyMs: z.number().nonnegative(),
        p50LatencyMs: z.number().nonnegative(),
        p75LatencyMs: z.number().nonnegative(),
        p90LatencyMs: z.number().nonnegative(),
        p99LatencyMs: z.number().nonnegative(),
        maxLatencyMs: z.number().nonnegative(),
        bytesPerSec: z.number().nonnegative(),
      }),
    )
    .nonempty(),
})

export const SSRLoadTestsSchema = SSRLoadSweepSchema.extend({
  runs: z.number().int().positive().optional(),
  samples: z.array(SSRLoadSweepSchema).nonempty().optional(),
  warmupDurationMs: z.number().positive().optional(),
}).refine(
  (stats) =>
    (stats.runs === undefined && stats.samples === undefined) ||
    (stats.samples !== undefined && stats.samples.length === stats.runs),
  { message: 'Expected one load sweep sample per run' },
)

export const SSRLoadStatsSchema = z.object({
  ssrLoadTests: SSRLoadTestsSchema,
  frameworkVersion: z.string().optional(),
  timingMeasuredAt: z.string().optional(),
  runner: z.string().optional(),
  browserVersion: z.string().optional(),
})

export const SSRRouterLinkLoadStatsSchema = SSRLoadStatsSchema.omit({
  ssrLoadTests: true,
}).extend({
  ssrRouterLinkLoadTests: SSRLoadStatsSchema.shape.ssrLoadTests,
})

const InteractionTestsSchema = z.object({
  scenario: z.literal('first-row-detail-navigation'),
  source: z.literal('lighthouse-inp-breakdown'),
  interactionLatencyMs: z.number().positive(),
  inputDelayMs: z.number().nonnegative(),
  processingDurationMs: z.number().nonnegative(),
  presentationDelayMs: z.number().nonnegative(),
})

const InteractionTimingSchema = z.object({
  interactionLatencyMs: z.number().nonnegative(),
  inputDelayMs: z.number().nonnegative(),
  processingDurationMs: z.number().nonnegative(),
  presentationDelayMs: z.number().nonnegative(),
})

const RenderedTestSampleSchema = z.object({
  firstPaintMs: z.number().positive(),
  fcpMs: z.number().positive(),
  interactionTests: InteractionTimingSchema,
})

const RenderedTestsSchema = z
  .object({
    firstPaintMs: z.number().positive(),
    fcpMs: z.number().positive(),
    /** Historical only; new runs record interactionTests instead. */
    inpMs: z.number().optional(),
    interactionTests: InteractionTestsSchema.optional(),
    runs: z.number().int().positive(),
    standardDeviation: InteractionTimingSchema.extend({
      firstPaintMs: z.number().nonnegative(),
      fcpMs: z.number().nonnegative(),
    }).optional(),
    samples: z.array(RenderedTestSampleSchema).nonempty().optional(),
  })
  .refine(
    (stats) =>
      stats.inpMs !== undefined || stats.interactionTests !== undefined,
    {
      message: 'Expected historical inpMs or current interactionTests',
    },
  )
  .refine(
    (stats) =>
      stats.samples === undefined || stats.samples.length === stats.runs,
    { message: 'Expected one browser sample per run' },
  )
  .refine(
    (stats) =>
      (stats.standardDeviation === undefined) === (stats.samples === undefined),
    { message: 'Expected standard deviation and samples together' },
  )

export const ClientSideRenderedStatsSchema = z.object({
  clientSideRenderedTests: RenderedTestsSchema,
  browserVersion: z.string().min(1),
})

export const ServerSideRenderedStatsSchema = z.object({
  serverSideRenderedTests: RenderedTestsSchema,
  browserVersion: z.string().min(1),
})
