import { summarizeMetric } from './sample-statistics.ts'
import { BuildStatsSchema } from '@framework-performance/results'

export function createBuildStats(cold: number[], warm: number[]) {
  function benchmark(name: 'coldBuild' | 'warmBuild', samples: number[]) {
    return {
      name,
      runs: samples.length,
      iterations: samples.map((timeMs) => ({
        duration: { value: timeMs, unit: 'ms' },
      })),
      duration: summarizeMetric(samples),
    }
  }
  return BuildStatsSchema.parse({
    coldBuild: benchmark('coldBuild', cold),
    warmBuild: benchmark('warmBuild', warm),
  })
}
