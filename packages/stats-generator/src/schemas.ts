import { z } from 'zod'

export const TimeStatSchema = z.object({
  avgMs: z.number(),
  minMs: z.number(),
  maxMs: z.number(),
})

export const InstallStatsSchema = z.object({
  frameworkVersion: z.string().min(1),
  installTime: TimeStatSchema,
  nodeModulesSize: z.number().nonnegative(),
})

export const BuildStatsSchema = z.object({
  coldBuildTime: TimeStatSchema,
  warmBuildTime: TimeStatSchema,
  buildOutputSize: z.number().nonnegative(),
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

export const SSRLoadStatsSchema = z.object({
  ssrLoadTests: z.object({
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
  }),
  frameworkVersion: z.string().optional(),
  timingMeasuredAt: z.string().optional(),
  runner: z.string().optional(),
  browserVersion: z.string().optional(),
})

const InteractionTestsSchema = z.object({
  scenario: z.literal('first-row-detail-navigation'),
  source: z.literal('lighthouse-inp-breakdown'),
  interactionLatencyMs: z.number().positive(),
  inputDelayMs: z.number().nonnegative(),
  processingDurationMs: z.number().nonnegative(),
  presentationDelayMs: z.number().nonnegative(),
})

const RenderedTestsSchema = z
  .object({
    firstPaintMs: z.number().positive(),
    fcpMs: z.number().positive(),
    /** Historical only; new runs record interactionTests instead. */
    inpMs: z.number().optional(),
    interactionTests: InteractionTestsSchema.optional(),
    runs: z.number().int().positive(),
  })
  .refine(
    (stats) =>
      stats.inpMs !== undefined || stats.interactionTests !== undefined,
    {
      message: 'Expected historical inpMs or current interactionTests',
    },
  )

export const ClientSideRenderedStatsSchema = z.object({
  clientSideRenderedTests: RenderedTestsSchema,
  browserVersion: z.string().min(1),
})

export const ServerSideRenderedStatsSchema = z.object({
  serverSideRenderedTests: RenderedTestsSchema,
  browserVersion: z.string().min(1),
})

export type InstallStats = z.infer<typeof InstallStatsSchema>
export type BuildStats = z.infer<typeof BuildStatsSchema>
export type BrowserBaselineStats = z.infer<typeof BrowserBaselineStatsSchema>
export type NodeEnginesStats = z.infer<typeof NodeEnginesStatsSchema>
export type SSRRequestThroughputStats = z.infer<
  typeof SSRRequestThroughputStatsSchema
>
export type SSRLoadStats = z.infer<typeof SSRLoadStatsSchema>
export type ClientSideRenderedStats = z.infer<
  typeof ClientSideRenderedStatsSchema
>
export type ServerSideRenderedStats = z.infer<
  typeof ServerSideRenderedStatsSchema
>
export type TimeStat = z.infer<typeof TimeStatSchema>
