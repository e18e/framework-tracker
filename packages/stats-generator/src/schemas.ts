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

export const SSRStatsSchema = z.object({
  ssrOpsPerSec: z.number().positive(),
  ssrAvgLatencyMs: z.number().nonnegative(),
  ssrSamples: z.number().positive(),
  ssrBodySizeKb: z.number().positive(),
  ssrDuplicationFactor: z.number().nonnegative(),
  frameworkVersion: z.string().optional(),
  timingMeasuredAt: z.string().optional(),
  runner: z.string().optional(),
})

export type InstallStats = z.infer<typeof InstallStatsSchema>
export type BuildStats = z.infer<typeof BuildStatsSchema>
export type SSRStats = z.infer<typeof SSRStatsSchema>
export type TimeStat = z.infer<typeof TimeStatSchema>
