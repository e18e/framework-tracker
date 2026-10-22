import type { z } from 'zod'
import {
  RequestThroughputBenchmarkSchema,
  RequestThroughputIterationSchema,
  RequestThroughputResultSchema,
  SSRRequestThroughputStatsSchema,
} from './schemas.ts'
import { summarizeMetric } from './sample-statistics.ts'
import type { CIStats } from './types.ts'

export type RequestThroughputIteration = z.infer<
  typeof RequestThroughputIterationSchema
>

export function createRequestThroughputIteration(
  throughputSamples: number[],
  latencySamplesMs: number[],
  medianLatencyMs: number,
): RequestThroughputIteration {
  if (throughputSamples.length !== latencySamplesMs.length) {
    throw new Error('Expected one throughput and latency sample per measured HTTP request')
  }
  return RequestThroughputIterationSchema.parse({
    opsPerSec: summarizeMetric(throughputSamples),
    latencyMs: summarizeMetric(latencySamplesMs),
    medianLatencyMs,
    samples: latencySamplesMs.length,
  })
}

type Configuration = Pick<
  z.infer<typeof RequestThroughputBenchmarkSchema>,
  | 'bodySizeKb'
  | 'duplicationFactor'
  | 'durationMs'
  | 'warmupDurationMs'
  | 'minimumSamples'
  | 'warmupMinimumSamples'
>

export function assembleRequestThroughput(
  iterations: RequestThroughputIteration[],
  configuration: Configuration,
) {
  return RequestThroughputBenchmarkSchema.parse({
    ...configuration,
    name: 'ssrRequestThroughput',
    source: 'tinybench',
    path: '/ssr-throughput',
    runs: iterations.length,
    iterations,
    samples: iterations.reduce(
      (count, iteration) => count + iteration.samples,
      0,
    ),
    opsPerSec: summarizeMetric(iterations.map((value) => value.opsPerSec.mean)),
    avgLatencyMs: summarizeMetric(
      iterations.map((value) => value.latencyMs.mean),
    ),
    medianLatencyMs: summarizeMetric(
      iterations.map((value) => value.medianLatencyMs),
    ),
  })
}

export function mergeRequestThroughputArtifact(
  stats: CIStats,
  artifact: unknown,
): CIStats {
  const incoming = RequestThroughputResultSchema.parse(artifact)
  const merged = {
    ...stats,
    frameworkVersion: incoming.frameworkVersion ?? stats.frameworkVersion,
    ssrRequestThroughputTests: incoming.ssrRequestThroughputTests,
  }
  SSRRequestThroughputStatsSchema.parse(merged)
  return merged
}

export function validateRequestThroughputForPersistence(stats: CIStats): void {
  if (stats.ssrRequestThroughputTests !== undefined) {
    SSRRequestThroughputStatsSchema.parse(stats)
  }
}
