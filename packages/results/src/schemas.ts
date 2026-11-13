import { selectRepresentativeIteration } from './selection.ts'
import { z } from 'zod'

const MetricChangeSchema = z.object({
  /** Defaults to zero when the previous value is zero. */
  percentChange: z.number(),
  /** Signed difference in the metric's unit: current minus previous. */
  valueChange: z.number(),
})

export const MetricVarianceSchema = z.object({
  comparedToMeasuredAt: z.string().nullable(),
  mean: MetricChangeSchema,
  median: MetricChangeSchema,
  min: MetricChangeSchema,
  max: MetricChangeSchema,
})

export const MetricUnitSchema = z.enum([
  'ms',
  'ops/s',
  'requests',
  'errors',
  'requests/s',
  'bytes/s',
  'bytes',
  'KiB',
  'count',
  'ratio',
])

export const MetricBaseSchema = z.object({
  unit: MetricUnitSchema,
  mean: z.number(),
  median: z.number(),
  min: z.number(),
  max: z.number(),
  variance: MetricVarianceSchema.optional(),
})
export type MetricBase = z.infer<typeof MetricBaseSchema>

// Each test defines its metric units; defaults also support historical summaries.
function metricWithUnit<T extends z.infer<typeof MetricUnitSchema>>(unit: T) {
  return MetricBaseSchema.extend({ unit: z.literal(unit).default(unit) })
}

function scalarWithUnit<T extends z.infer<typeof MetricUnitSchema>>(
  unit: T,
  value: z.ZodNumber,
) {
  return z.object({ value, unit: z.literal(unit).default(unit) })
}

const MillisecondsMetricSchema = metricWithUnit('ms')
const OperationsPerSecondMetricSchema = metricWithUnit('ops/s')

export const FrameworkSchema = z.enum([
  'baseline-html',
  'astro',
  'next',
  'nuxt',
  'nifra',
  'pracht',
  'react-router',
  'solid-start',
  'solid',
  'sveltekit',
  'tanstack',
])

export const PackagePathSchema = z.enum([
  'packages/app-baseline-html',
  'packages/starter-astro',
  'packages/app-astro',
  'packages/starter-next-js',
  'packages/app-next-js',
  'packages/starter-nuxt',
  'packages/app-nuxt',
  'packages/starter-nifra',
  'packages/app-nifra',
  'packages/starter-pracht',
  'packages/app-pracht',
  'packages/starter-react-router',
  'packages/app-react-router',
  'packages/starter-solid-start',
  'packages/app-solid-start',
  'packages/starter-solid',
  'packages/app-solid',
  'packages/starter-sveltekit',
  'packages/app-sveltekit',
  'packages/starter-tanstack-start-react',
  'packages/app-tanstack-start-react',
])

export const BaseResultSchema = z.object({
  framework: FrameworkSchema,
  packagePath: PackagePathSchema,
  timingMeasuredAt: z.iso.datetime(),
  runner: z.string().min(1),
})

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
  duration: scalarWithUnit('ms', z.number().nonnegative()),
})

export const InstallBenchmarkSchema = createBenchmarkBaseSchema(
  InstallIterationSchema,
).safeExtend({
  name: z.literal('install'),
  duration: MillisecondsMetricSchema,
  nodeModulesSize: scalarWithUnit('bytes', z.number().nonnegative()),
})

/** Artifact emitted by the install runner, before overall result assembly. */
export const InstallResultSchema = z.object({
  frameworkVersion: z.string().min(1),
  install: InstallBenchmarkSchema,
})

export const BuildIterationSchema = z.object({
  duration: scalarWithUnit('ms', z.number().nonnegative()),
})
export const BuildBenchmarkSchema = createBenchmarkBaseSchema(
  BuildIterationSchema,
).safeExtend({
  name: z.enum(['coldBuild', 'warmBuild']),
  duration: MillisecondsMetricSchema,
})
export const BuildStatsSchema = z.object({
  coldBuild: BuildBenchmarkSchema.safeExtend({
    name: z.literal('coldBuild'),
  }),
  warmBuild: BuildBenchmarkSchema.safeExtend({
    name: z.literal('warmBuild'),
  }),
})

export const DevServerIterationSchema = z.object({
  duration: scalarWithUnit('ms', z.number().nonnegative()),
})

export const DevServerBenchmarkSchema = createBenchmarkBaseSchema(
  DevServerIterationSchema,
).safeExtend({
  name: z.literal('devServer'),
  duration: MillisecondsMetricSchema,
})

export const DevServerStatsSchema = z.object({
  devServer: DevServerBenchmarkSchema,
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
  baselineFeatureCount: scalarWithUnit('count', z.number().nonnegative()),
})

export const NodeEnginesStatsSchema = TestBaseSchema.extend({
  name: z.literal('nodeEngines'),
  minimumNodeVersion: z.string().nullable(),
  imposedBy: z.array(z.string()),
  scannedPackageCount: scalarWithUnit('count', z.number().nonnegative()),
  packagesDeclaringNodeEngineCount: scalarWithUnit(
    'count',
    z.number().nonnegative(),
  ),
  unsatisfiableRanges: z.array(z.string()),
})

export const LegacySSRRequestThroughputSchema = z.object({
  requestThroughput: scalarWithUnit('ops/s', z.number().positive()),
  avgLatency: scalarWithUnit('ms', z.number().nonnegative()),
  medianLatency: scalarWithUnit('ms', z.number().nonnegative()),
  requests: scalarWithUnit('requests', z.number().positive()),
  bodySize: scalarWithUnit('KiB', z.number().positive()),
  duplicationFactor: scalarWithUnit('ratio', z.number().nonnegative()),
})

export const RequestThroughputIterationSchema = z.object({
  requestThroughput: OperationsPerSecondMetricSchema,
  latency: MillisecondsMetricSchema,
  requests: scalarWithUnit('requests', z.number().int().positive()),
})
export const RequestThroughputBenchmarkSchema = createBenchmarkBaseSchema(
  RequestThroughputIterationSchema,
)
  .safeExtend({
    name: z.literal('ssrRequestThroughput'),
    requestThroughput: OperationsPerSecondMetricSchema,
    latency: MillisecondsMetricSchema,
    totalRequests: scalarWithUnit('requests', z.number().int().positive()),
    bodySize: scalarWithUnit('KiB', z.number().positive()),
    duplicationFactor: scalarWithUnit('ratio', z.number().nonnegative()),
  })
  .refine(
    (value) =>
      value.totalRequests.value ===
      value.iterations.reduce(
        (count, iteration) => count + iteration.requests.value,
        0,
      ),
    {
      message: 'Expected total HTTP sample count to match iterations',
      path: ['totalRequests'],
    },
  )

export const RequestThroughputResultSchema = z.object({
  ssrRequestThroughput: RequestThroughputBenchmarkSchema,
  frameworkVersion: z.string().optional(),
  timingMeasuredAt: z.string().optional(),
  runner: z.string().optional(),
  browserVersion: z.string().optional(),
})

/** Compatibility for current checked-in summaries that predate raw retention. */
export const SSRRequestThroughputStatsSchema =
  RequestThroughputResultSchema.extend({
    ssrRequestThroughput: z.union([
      RequestThroughputBenchmarkSchema,
      LegacySSRRequestThroughputSchema,
    ]),
  })

export const SSRLoadStageSchema = z.strictObject({
  connections: z.number().int().positive(),
  duration: scalarWithUnit('ms', z.number().positive()),
  requests: scalarWithUnit('requests', z.number().int().nonnegative()),
  errors: scalarWithUnit('errors', z.number().int().nonnegative()),
  requestThroughput: scalarWithUnit('requests/s', z.number().nonnegative()),
  avgLatency: scalarWithUnit('ms', z.number().nonnegative()),
  p50Latency: scalarWithUnit('ms', z.number().nonnegative()),
  p75Latency: scalarWithUnit('ms', z.number().nonnegative()),
  p90Latency: scalarWithUnit('ms', z.number().nonnegative()),
  p99Latency: scalarWithUnit('ms', z.number().nonnegative()),
  maxLatency: scalarWithUnit('ms', z.number().nonnegative()),
  byteThroughput: scalarWithUnit('bytes/s', z.number().nonnegative()),
})

export const SSRLoadSweepSchema = z.array(SSRLoadStageSchema).nonempty()

export const SSRLoadStageSummarySchema = z.object({
  connections: z.number().int().positive(),
  requests: metricWithUnit('requests'),
  errors: metricWithUnit('errors'),
  requestThroughput: metricWithUnit('requests/s'),
  avgLatency: MillisecondsMetricSchema,
  p50Latency: MillisecondsMetricSchema,
  p75Latency: MillisecondsMetricSchema,
  p90Latency: MillisecondsMetricSchema,
  p99Latency: MillisecondsMetricSchema,
  maxLatency: MillisecondsMetricSchema,
  byteThroughput: metricWithUnit('bytes/s'),
})

const SSRLoadResultSchema = createBenchmarkBaseSchema(SSRLoadSweepSchema)
  .safeExtend({
    name: z.enum(['ssrLoad', 'ssrRouterLinkLoad']),
    representativeIterationIndex: z.number().int().nonnegative(),
    totalRequests: scalarWithUnit('requests', z.number().int().nonnegative()),
    totalErrors: scalarWithUnit('errors', z.number().int().nonnegative()),
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
      const connections = value.iterations[0]?.map((stage) => stage.connections)
      return (
        connections !== undefined &&
        new Set(connections).size === connections.length &&
        [
          value.stage1,
          value.stage2,
          value.stage3,
          value.stage4,
          value.stage5,
          value.stage6,
          value.stage7,
        ].every((stage, index) =>
          index < connections.length
            ? stage?.connections === connections[index]
            : stage === undefined,
        ) &&
        connections.length <= 7 &&
        value.iterations.every(
          (sweep) =>
            sweep.length === connections.length &&
            sweep.every(
              (stage, index) => stage.connections === connections[index],
            ),
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

// Older files placed these settings inside the test result.
export const SSRLoadTestsSchema = z.preprocess((value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const {
    configuration: _configuration,
    path: _path,
    source: _source,
    ...result
  } = value as Record<string, unknown>
  return result
}, SSRLoadResultSchema)

export const SSRLoadStatsSchema = z.object({
  ssrLoad: SSRLoadTestsSchema.refine((value) => value.name === 'ssrLoad'),
  frameworkVersion: z.string().optional(),
  timingMeasuredAt: z.string().optional(),
  runner: z.string().optional(),
  browserVersion: z.string().optional(),
})

export const SSRRouterLinkLoadStatsSchema = SSRLoadStatsSchema.omit({
  ssrLoad: true,
}).extend({
  ssrRouterLinkLoad: SSRLoadTestsSchema.refine(
    (value) => value.name === 'ssrRouterLinkLoad',
  ),
})

const InteractionTestsSchema = z.object({
  interactionLatency: scalarWithUnit('ms', z.number().positive()),
  inputDelay: scalarWithUnit('ms', z.number().nonnegative()),
  processingDuration: scalarWithUnit('ms', z.number().nonnegative()),
  presentationDelay: scalarWithUnit('ms', z.number().nonnegative()),
})

export const InteractionTimingSchema = z.object({
  interactionLatency: scalarWithUnit('ms', z.number().nonnegative()),
  inputDelay: scalarWithUnit('ms', z.number().nonnegative()),
  processingDuration: scalarWithUnit('ms', z.number().nonnegative()),
  presentationDelay: scalarWithUnit('ms', z.number().nonnegative()),
})

export const RenderedTestSampleSchema = z.object({
  firstPaint: scalarWithUnit('ms', z.number().positive()),
  firstContentfulPaint: scalarWithUnit('ms', z.number().positive()),
  interactionTests: InteractionTimingSchema,
})

export const LegacyRenderedTestsSchema = z
  .object({
    firstPaint: scalarWithUnit('ms', z.number().positive()),
    firstContentfulPaint: scalarWithUnit('ms', z.number().positive()),
    /** Historical only; new runs record interactionTests instead. */
    inp: scalarWithUnit('ms', z.number()).optional(),
    interactionTests: InteractionTestsSchema.optional(),
    runs: z.number().int().positive(),
    standardDeviation: InteractionTimingSchema.extend({
      firstPaint: scalarWithUnit('ms', z.number().nonnegative()),
      firstContentfulPaint: scalarWithUnit('ms', z.number().nonnegative()),
    }).optional(),
    iterations: z.array(RenderedTestSampleSchema).nonempty().optional(),
  })
  .refine(
    (stats) => stats.inp !== undefined || stats.interactionTests !== undefined,
    {
      message: 'Expected historical inp or current interactionTests',
    },
  )
  .refine(
    (stats) =>
      stats.iterations === undefined || stats.iterations.length === stats.runs,
    { message: 'Expected one browser sample per run' },
  )
  .refine(
    (stats) =>
      (stats.standardDeviation === undefined) ===
      (stats.iterations === undefined),
    { message: 'Expected standard deviation and iterations together' },
  )

export const ClientRenderingIterationSchema = RenderedTestSampleSchema
export const ClientRenderingBenchmarkSchema = createBenchmarkBaseSchema(
  ClientRenderingIterationSchema,
).safeExtend({
  name: z.literal('clientSideRendered'),
  firstPaint: MillisecondsMetricSchema,
  firstContentfulPaint: MillisecondsMetricSchema,
  interactionTests: z.object({
    interactionLatency: MillisecondsMetricSchema,
    inputDelay: MillisecondsMetricSchema,
    processingDuration: MillisecondsMetricSchema,
    presentationDelay: MillisecondsMetricSchema,
  }),
})

export const ServerRenderingIterationSchema = RenderedTestSampleSchema
export const ServerRenderingBenchmarkSchema = createBenchmarkBaseSchema(
  ServerRenderingIterationSchema,
).safeExtend({
  name: z.literal('serverSideRendered'),
  firstPaint: MillisecondsMetricSchema,
  firstContentfulPaint: MillisecondsMetricSchema,
  interactionTests: z.object({
    interactionLatency: MillisecondsMetricSchema,
    inputDelay: MillisecondsMetricSchema,
    processingDuration: MillisecondsMetricSchema,
    presentationDelay: MillisecondsMetricSchema,
  }),
})

export const ClientSideRenderedStatsSchema = z.object({
  clientSideRendered: ClientRenderingBenchmarkSchema,
  browserVersion: z.string().min(1),
})

export const ServerSideRenderedStatsSchema = z.object({
  serverSideRendered: ServerRenderingBenchmarkSchema,
  browserVersion: z.string().min(1),
})

/** @see https://developer.chrome.com/docs/lighthouse/performance/resource-summary */
export const InitialLoadResourceTypeSchema = z.enum([
  'total',
  'document',
  'script',
  'stylesheet',
  'image',
  'media',
  'font',
  'other',
  'third-party',
])

export const InitialLoadResourceSchema = z.object({
  requestCount: scalarWithUnit('requests', z.number().int().nonnegative()),
  /** Transferred bytes, including response headers, as reported by Lighthouse. */
  transferSize: scalarWithUnit('bytes', z.number().int().nonnegative()),
})

export const InitialLoadStatsSchema = TestBaseSchema.extend({
  name: z.literal('initialLoad'),
  resources: z.record(InitialLoadResourceTypeSchema, InitialLoadResourceSchema),
})

export const InitialLoadResultSchema = z.object({
  initialLoad: InitialLoadStatsSchema,
  frameworkVersion: z.string().optional(),
  timingMeasuredAt: z.string().optional(),
  runner: z.string().optional(),
  browserVersion: z.string().min(1),
})

export type InitialLoadStats = z.infer<typeof InitialLoadStatsSchema>
export type InitialLoadResult = z.infer<typeof InitialLoadResultSchema>

export const DependencyCountsSchema = z.object({
  productionDependencyCount: scalarWithUnit(
    'count',
    z.number().int().nonnegative(),
  ),
  developmentDependencyCount: scalarWithUnit(
    'count',
    z.number().int().nonnegative(),
  ),
  totalDependencyCount: scalarWithUnit('count', z.number().int().nonnegative()),
})
export const DependencyScanSchema = TestBaseSchema.extend(
  DependencyCountsSchema.shape,
).extend({
  name: z.literal('dependencies'),
  duplicateDependencyCount: scalarWithUnit(
    'count',
    z.number().int().nonnegative(),
  ).optional(),
  dependencyInstallSize: scalarWithUnit(
    'bytes',
    z.number().nonnegative(),
  ).optional(),
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
  duplicateDependencyCount: scalarWithUnit(
    'count',
    z.number().int().nonnegative(),
  ).optional(),
})
export const CoreJsStatsSchema = TestBaseSchema.extend({
  name: z.literal('coreJs'),
  totalVendoredSize: scalarWithUnit('bytes', z.number().int().nonnegative()),
  unnecessaryModules: z.array(z.string()),
})

export const FrameworkResultSchema = z.object({
  framework: FrameworkSchema.optional(),
  packagePath: PackagePathSchema.optional(),
  name: z.string().optional(),
  type: z.enum(['starter-kit', 'runtime-app']).optional(),
  package: z.string().optional(),
  order: z.number().optional(),
  timingMeasuredAt: z.string().optional(),
  runner: z.string().optional(),
  browserVersion: z.string().optional(),
  frameworkVersion: z.string().optional(),
  releasedAt: z.string().optional(),
  initialLoad: InitialLoadStatsSchema.optional(),
  install: InstallBenchmarkSchema.optional(),
  coldBuild: BuildStatsSchema.shape.coldBuild.optional(),
  warmBuild: BuildStatsSchema.shape.warmBuild.optional(),
  devServer: DevServerBenchmarkSchema.optional(),
  ssrRequestThroughput: z
    .union([RequestThroughputBenchmarkSchema, LegacySSRRequestThroughputSchema])
    .optional(),
  ssrLoad: SSRLoadTestsSchema.refine(
    (value) => value.name === 'ssrLoad',
  ).optional(),
  ssrRouterLinkLoad: SSRLoadTestsSchema.refine(
    (value) => value.name === 'ssrRouterLinkLoad',
  ).optional(),
  clientSideRendered: z
    .union([ClientRenderingBenchmarkSchema, LegacyRenderedTestsSchema])
    .optional(),
  serverSideRendered: z
    .union([ServerRenderingBenchmarkSchema, LegacyRenderedTestsSchema])
    .optional(),
  coreJs: CoreJsStatsSchema.optional(),
  nodeEngines: NodeEnginesStatsSchema.partial()
    .required({ name: true, minimumNodeVersion: true, imposedBy: true })
    .optional(),
  dependencies: DependencyScanSchema.optional(),
  productionDependencyCount: scalarWithUnit(
    'count',
    z.number().nonnegative(),
  ).optional(),
  developmentDependencyCount: scalarWithUnit(
    'count',
    z.number().nonnegative(),
  ).optional(),
  totalDependencyCount: scalarWithUnit(
    'count',
    z.number().nonnegative(),
  ).optional(),
  frameworkDependencies: DependencyCountsSchema.extend({
    name: z.literal('frameworkDependencies').optional(),
  }).optional(),
  firstPartyDependencies: FirstPartyDependencyScanSchema.extend({
    name: z.literal('firstPartyDependencies').optional(),
  }).optional(),
  duplicateDependencyCount: scalarWithUnit(
    'count',
    z.number().nonnegative(),
  ).optional(),
  dependencyInstallSize: scalarWithUnit(
    'bytes',
    z.number().nonnegative(),
  ).optional(),
  vendoredCoreJsSize: scalarWithUnit(
    'bytes',
    z.number().nonnegative(),
  ).optional(),
  vendoredCoreJsUnnecessaryModules: z.array(z.string()).optional(),
  browserBaseline: BrowserBaselineStatsSchema.extend({
    name: z.literal('browserBaseline').optional(),
  }).optional(),
  minimumNodeVersion: z.string().optional(),
  minimumNodeVersionImposedBy: z.array(z.string()).optional(),
  testTime: scalarWithUnit('ms', z.number()).optional(),
  coldBuildDuration: scalarWithUnit('ms', z.number().nonnegative()).optional(),
  warmBuildDuration: scalarWithUnit('ms', z.number().nonnegative()).optional(),
  packageJson: z
    .object({
      dependencies: z.record(z.string(), z.string()).optional(),
      devDependencies: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
})
export type FrameworkResult = z.infer<typeof FrameworkResultSchema>
