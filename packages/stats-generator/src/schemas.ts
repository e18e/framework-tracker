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
  nodeModulesSizeProdOnly: z.number().nonnegative(),
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
})

export type InstallStats = z.infer<typeof InstallStatsSchema>
export type BuildStats = z.infer<typeof BuildStatsSchema>
export type BrowserBaselineStats = z.infer<typeof BrowserBaselineStatsSchema>
export type SSRRequestThroughputStats = z.infer<
  typeof SSRRequestThroughputStatsSchema
>
export type SSRLoadStats = z.infer<typeof SSRLoadStatsSchema>
export type TimeStat = z.infer<typeof TimeStatSchema>
