import {
  RequestThroughputBenchmarkSchema,
  LegacySSRRequestThroughputSchema,
} from '@framework-tracker/results'
import { z } from 'astro/zod'

export const requestThroughputContentSchema = z.union([
  RequestThroughputBenchmarkSchema.transform((value) => ({
    ...value,
    opsPerSec: value.opsPerSec.mean,
    latencyMs: value.latencyMs.mean,
  })),
  // Current checked-in records have rounded summaries and no recoverable samples.
  LegacySSRRequestThroughputSchema.transform((value) => ({
    ...value,
    latencyMs: value.avgLatencyMs,
  })),
])
