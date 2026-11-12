import type { z } from 'zod'
import {
  RequestThroughputBenchmarkSchema,
  RequestThroughputIterationSchema,
  RequestThroughputResultSchema,
  SSRRequestThroughputStatsSchema,
} from '@framework-performance/results'
import { summarizeMetric } from './sample-statistics.ts'
import type { CIStats } from './types.ts'

export type RequestThroughputIteration = z.infer<
  typeof RequestThroughputIterationSchema
>

export function createRequestThroughputIteration(
  throughputSamples: number[],
  latencySamplesMs: number[],
): RequestThroughputIteration {
  if (throughputSamples.length !== latencySamplesMs.length) {
    throw new Error(
      'Expected one throughput and latency sample per measured HTTP request',
    )
  }
  return RequestThroughputIterationSchema.parse({
    requestThroughput: summarizeMetric(throughputSamples),
    latency: summarizeMetric(latencySamplesMs),
    requests: { value: latencySamplesMs.length, unit: 'requests' },
  })
}

type Configuration = Pick<
  z.infer<typeof RequestThroughputBenchmarkSchema>,
  | 'bodySize'
  | 'duplicationFactor'
  | 'durationMs'
  | 'warmupDurationMs'
  | 'minimumRequests'
  | 'warmupMinimumRequests'
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
    totalRequests: {
      value: iterations.reduce(
        (count, iteration) => count + iteration.requests.value,
        0,
      ),
      unit: 'requests',
    },
    requestThroughput: summarizeMetric(
      iterations.map((value) => value.requestThroughput.mean),
    ),
    latency: summarizeMetric(iterations.map((value) => value.latency.mean)),
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
    ssrRequestThroughput: incoming.ssrRequestThroughput,
  }
  SSRRequestThroughputStatsSchema.parse(merged)
  return merged
}

export function validateRequestThroughputForPersistence(stats: CIStats): void {
  if (stats.ssrRequestThroughput !== undefined) {
    SSRRequestThroughputStatsSchema.parse(stats)
  }
}
