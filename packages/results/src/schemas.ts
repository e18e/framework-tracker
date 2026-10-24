import { selectRepresentativeIteration } from './selection.ts'
import { z } from 'zod'

/** Summary of one metric; units belong to the metric being measured. */
export const MetricBaseSchema = z.object({
  /** Arithmetic mean of the measured values. */
  mean: z.number(),
  median: z.number(),
  /** Lowest measured value. */
  min: z.number(),
  /** Highest measured value. */
  max: z.number(),
})
export type MetricBase = z.infer<typeof MetricBaseSchema>

/** Framework identifiers configured in packages/stats-generator/src/frameworks.ts. */
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

/** Tested package folders configured in packages/stats-generator/src/frameworks.ts. */
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

export const BuildIterationSchema = z.object({
  timeMs: z.number().nonnegative(),
})
export const BuildBenchmarkSchema = createBenchmarkBaseSchema(
  BuildIterationSchema,
).safeExtend({
  name: z.enum(['coldBuild', 'warmBuild']),
  timeMs: MetricBaseSchema,
})
export const BuildStatsSchema = z.object({
  coldBuildTime: BuildBenchmarkSchema.safeExtend({
    name: z.literal('coldBuild'),
  }),
  warmBuildTime: BuildBenchmarkSchema.safeExtend({
    name: z.literal('warmBuild'),
  }),
})

export const DevServerIterationSchema = z.object({
  timeMs: z.number().nonnegative(),
})

export const DevServerBenchmarkSchema = createBenchmarkBaseSchema(
  DevServerIterationSchema,
).safeExtend({
  name: z.literal('devServer'),
  timeMs: MetricBaseSchema,
})

export const DevServerStatsSchema = z.object({
  devServerStartTime: DevServerBenchmarkSchema,
})

export const BrowserBaselineStatsSchema = TestBaseSchema.extend({
  name: z.literal('browserBaseline'),
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

export const NodeEnginesStatsSchema = TestBaseSchema.extend({
  name: z.literal('nodeEngines'),
  minimumNodeVersion: z.string().nullable(),
  imposedBy: z.array(z.string()),
  packagesScanned: z.number().nonnegative(),
  packagesDeclaringNodeEngine: z.number().nonnegative(),
  unsatisfiableRanges: z.array(z.string()),
})

export const LegacySSRRequestThroughputSchema = z.object({
  opsPerSec: z.number().positive(),
  avgLatencyMs: z.number().nonnegative(),
  medianLatencyMs: z.number().nonnegative(),
  samples: z.number().positive(),
  bodySizeKb: z.number().positive(),
  duplicationFactor: z.number().nonnegative(),
})

export const RequestThroughputIterationSchema = z.object({
  opsPerSec: MetricBaseSchema,
  latencyMs: MetricBaseSchema,
  samples: z.number().int().positive(),
})
export const RequestThroughputBenchmarkSchema = createBenchmarkBaseSchema(
  RequestThroughputIterationSchema,
)
  .safeExtend({
    name: z.literal('ssrRequestThroughput'),
    opsPerSec: MetricBaseSchema,
    latencyMs: MetricBaseSchema,
    samples: z.number().int().positive(),
    bodySizeKb: z.number().positive(),
    duplicationFactor: z.number().nonnegative(),
    durationMs: z.number().positive(),
    warmupDurationMs: z.number().nonnegative(),
    minimumSamples: z.number().int().positive(),
    warmupMinimumSamples: z.number().int().nonnegative(),
    source: z.literal('tinybench'),
    path: z.literal('/ssr-throughput'),
  })
  .refine(
    (value) =>
      value.samples ===
      value.iterations.reduce(
        (count, iteration) => count + iteration.samples,
        0,
      ),
    {
      message: 'Expected total HTTP sample count to match iterations',
      path: ['samples'],
    },
  )

export const RequestThroughputResultSchema = z.object({
  ssrRequestThroughputTests: RequestThroughputBenchmarkSchema,
  frameworkVersion: z.string().optional(),
  timingMeasuredAt: z.string().optional(),
  runner: z.string().optional(),
  browserVersion: z.string().optional(),
})

/** Compatibility for current checked-in summaries that predate raw retention. */
export const SSRRequestThroughputStatsSchema =
  RequestThroughputResultSchema.extend({
    ssrRequestThroughputTests: z.union([
      RequestThroughputBenchmarkSchema,
      LegacySSRRequestThroughputSchema,
    ]),
  })

export const SSRLoadStageSchema = z
  .object({
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
  .strict()

export const SSRLoadSweepSchema = z.array(SSRLoadStageSchema).nonempty()

export const SSRLoadStageSummarySchema = z.object({
  connections: z.number().int().positive(),
  requests: MetricBaseSchema,
  errors: MetricBaseSchema,
  requestsPerSec: MetricBaseSchema,
  avgLatencyMs: MetricBaseSchema,
  p50LatencyMs: MetricBaseSchema,
  p75LatencyMs: MetricBaseSchema,
  p90LatencyMs: MetricBaseSchema,
  p99LatencyMs: MetricBaseSchema,
  maxLatencyMs: MetricBaseSchema,
  bytesPerSec: MetricBaseSchema,
})

export const SSRLoadTestsSchema = createBenchmarkBaseSchema(SSRLoadSweepSchema)
  .safeExtend({
    name: z.enum(['ssrLoad', 'ssrRouterLinkLoad']),
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
    stage1: SSRLoadStageSummarySchema,
    stage2: SSRLoadStageSummarySchema.optional(),
    stage3: SSRLoadStageSummarySchema.optional(),
    stage4: SSRLoadStageSummarySchema.optional(),
    stage5: SSRLoadStageSummarySchema.optional(),
    stage6: SSRLoadStageSummarySchema.optional(),
    stage7: SSRLoadStageSummarySchema.optional(),
  })
  .strict()
  .refine(
    (value) => {
      const workers = value.iterations[0]?.map((stage) => stage.workers)
      return (
        workers !== undefined &&
        new Set(workers).size === workers.length &&
        JSON.stringify(value.configuration.workerStages) ===
          JSON.stringify(workers) &&
        [
          value.stage1,
          value.stage2,
          value.stage3,
          value.stage4,
          value.stage5,
          value.stage6,
          value.stage7,
        ].every((stage, index) =>
          index < workers.length
            ? stage?.connections === workers[index]
            : stage === undefined,
        ) &&
        workers.length <= 7 &&
        value.iterations.every(
          (sweep) =>
            sweep.length === workers.length &&
            sweep.every((stage, index) => stage.workers === workers[index]),
        )
      )
    },
    { message: 'Expected matching worker stages in every sweep' },
  )
  .refine(
    (value) => {
      try {
        return (
          value.representativeIterationIndex ===
          selectRepresentativeIteration(value.iterations)
        )
      } catch {
        return false
      }
    },
    { message: 'Expected the actual median peak throughput sweep' },
  )

export const SSRLoadStatsSchema = z.object({
  ssrLoadTests: SSRLoadTestsSchema.refine((value) => value.name === 'ssrLoad'),
  frameworkVersion: z.string().optional(),
  timingMeasuredAt: z.string().optional(),
  runner: z.string().optional(),
  browserVersion: z.string().optional(),
})

export const SSRRouterLinkLoadStatsSchema = SSRLoadStatsSchema.omit({
  ssrLoadTests: true,
}).extend({
  ssrRouterLinkLoadTests: SSRLoadTestsSchema.refine(
    (value) => value.name === 'ssrRouterLinkLoad',
  ),
})

const InteractionTestsSchema = z.object({
  scenario: z.literal('first-row-detail-navigation'),
  source: z.literal('lighthouse-inp-breakdown'),
  interactionLatencyMs: z.number().positive(),
  inputDelayMs: z.number().nonnegative(),
  processingDurationMs: z.number().nonnegative(),
  presentationDelayMs: z.number().nonnegative(),
})

export const InteractionTimingSchema = z.object({
  interactionLatencyMs: z.number().nonnegative(),
  inputDelayMs: z.number().nonnegative(),
  processingDurationMs: z.number().nonnegative(),
  presentationDelayMs: z.number().nonnegative(),
})

export const RenderedTestSampleSchema = z.object({
  firstPaintMs: z.number().positive(),
  fcpMs: z.number().positive(),
  interactionTests: InteractionTimingSchema,
})

export const LegacyRenderedTestsSchema = z
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

export const ClientRenderingIterationSchema = RenderedTestSampleSchema
export const ClientRenderingBenchmarkSchema = createBenchmarkBaseSchema(
  ClientRenderingIterationSchema,
).safeExtend({
  name: z.literal('clientSideRendered'),
  firstPaintMs: MetricBaseSchema,
  fcpMs: MetricBaseSchema,
  interactionTests: z.object({
    scenario: z.literal('first-row-detail-navigation'),
    source: z.literal('lighthouse-inp-breakdown'),
    interactionLatencyMs: MetricBaseSchema,
    inputDelayMs: MetricBaseSchema,
    processingDurationMs: MetricBaseSchema,
    presentationDelayMs: MetricBaseSchema,
  }),
})

export const ServerRenderingIterationSchema = RenderedTestSampleSchema
export const ServerRenderingBenchmarkSchema = createBenchmarkBaseSchema(
  ServerRenderingIterationSchema,
).safeExtend({
  name: z.literal('serverSideRendered'),
  firstPaintMs: MetricBaseSchema,
  fcpMs: MetricBaseSchema,
  interactionTests: z.object({
    scenario: z.literal('first-row-detail-navigation'),
    source: z.literal('lighthouse-inp-breakdown'),
    interactionLatencyMs: MetricBaseSchema,
    inputDelayMs: MetricBaseSchema,
    processingDurationMs: MetricBaseSchema,
    presentationDelayMs: MetricBaseSchema,
  }),
})

export const ClientSideRenderedStatsSchema = z.object({
  clientSideRenderedTests: ClientRenderingBenchmarkSchema,
  browserVersion: z.string().min(1),
})

export const ServerSideRenderedStatsSchema = z.object({
  serverSideRenderedTests: ServerRenderingBenchmarkSchema,
  browserVersion: z.string().min(1),
})

export const DependencyCountsSchema = z.object({
  prodDependencies: z.number().int().nonnegative(),
  devDependencies: z.number().int().nonnegative(),
  allDependencies: z.number().int().nonnegative(),
})
export const DependencyScanSchema = TestBaseSchema.extend(
  DependencyCountsSchema.shape,
).extend({
  name: z.literal('dependencies'),
  duplicateDependencies: z.number().int().nonnegative().optional(),
  depInstallSize: z.number().nonnegative().optional(),
})
export const FrameworkDependencyScanSchema = TestBaseSchema.extend(
  DependencyCountsSchema.shape,
).extend({
  name: z.literal('frameworkDependencies'),
})
export const FirstPartyDependencyScanSchema = TestBaseSchema.extend(
  DependencyCountsSchema.shape,
).extend({
  name: z.literal('firstPartyDependencies'),
  duplicateDependencies: z.number().int().nonnegative().optional(),
})
export const CoreJsStatsSchema = TestBaseSchema.extend({
  name: z.literal('corejs'),
  totalVendoredBytes: z.number().int().nonnegative(),
  unnecessaryModules: z.array(z.string()),
})
