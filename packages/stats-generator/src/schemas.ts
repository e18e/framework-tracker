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

export type InstallStats = z.infer<typeof InstallStatsSchema>
export type BuildStats = z.infer<typeof BuildStatsSchema>
export type SSRRequestThroughputStats = z.infer<
  typeof SSRRequestThroughputStatsSchema
>
export type TimeStat = z.infer<typeof TimeStatSchema>
