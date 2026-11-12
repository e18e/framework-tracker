import { summarizeMetric } from './sample-statistics.ts'
import { BuildStatsSchema } from '@framework-performance/results'

export function createBuildStats(cold: number[], warm: number[]) {
  function benchmark(name: 'coldBuild' | 'warmBuild', samples: number[]) {
    return {
      name,
      runs: samples.length,
      iterations: samples.map((timeMs) => ({
        timeMs: { value: timeMs, unit: 'ms' },
      })),
      timeMs: summarizeMetric(samples),
    }
  }
  return BuildStatsSchema.parse({
    coldBuildTime: benchmark('coldBuild', cold),
    warmBuildTime: benchmark('warmBuild', warm),
  })
}
