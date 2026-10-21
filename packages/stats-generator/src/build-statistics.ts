import { summarizeMetric } from './sample-statistics.ts'
import { BuildStatsSchema } from './schemas.ts'

export function createBuildStats(
  framework: string,
  packagePath: string,
  cold: number[],
  warm: number[],
) {
  function benchmark(name: 'coldBuild' | 'warmBuild', samples: number[]) {
    return {
      name,
      framework,
      packagePath,
      runs: samples.length,
      iterations: samples.map((timeMs) => ({ timeMs })),
      timeMs: summarizeMetric(samples),
    }
  }
  return BuildStatsSchema.parse({
    coldBuildTime: benchmark('coldBuild', cold),
    warmBuildTime: benchmark('warmBuild', warm),
  })
}
