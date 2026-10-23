import { z } from 'astro/zod'

const metricSchema = z.object({
  mean: z.number(),
  median: z.number(),
  min: z.number(),
  max: z.number(),
})

const iterationSchema = z.object({
  opsPerSec: metricSchema,
  latencyMs: metricSchema,
  samples: z.number().int().positive(),
})

export const requestThroughputContentSchema = z.union([
  z
    .object({
      name: z.literal('ssrRequestThroughput'),
      runs: z.number().int().positive(),
      iterations: z.array(iterationSchema),
      opsPerSec: metricSchema,
      latencyMs: metricSchema,
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
    .refine((value) => value.runs === value.iterations.length)
    .refine(
      (value) =>
        value.samples ===
        value.iterations.reduce(
          (count, iteration) => count + iteration.samples,
          0,
        ),
    )
    .transform((value) => ({
      ...value,
      opsPerSec: value.opsPerSec.mean,
      latencyMs: value.latencyMs.mean,
    })),
  // Current checked-in records have rounded summaries and no recoverable samples.
  z
    .object({
      opsPerSec: z.number().positive(),
      avgLatencyMs: z.number().nonnegative(),
      medianLatencyMs: z.number().nonnegative(),
      samples: z.number().positive(),
      bodySizeKb: z.number().positive(),
      duplicationFactor: z.number().nonnegative(),
    })
    .transform((value) => ({ ...value, latencyMs: value.avgLatencyMs })),
])
