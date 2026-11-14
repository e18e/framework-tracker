import { summarizeMetric } from './sample-statistics.ts'
import { DevServerStatsSchema } from '@framework-performance/results'

export function createDevServerStats(samples: number[]) {
  return DevServerStatsSchema.parse({
    devServer: {
      name: 'devServer',
      runs: samples.length,
      iterations: samples.map((timeMs) => ({
        duration: { value: timeMs, unit: 'ms' },
      })),
      duration: summarizeMetric(samples),
    },
  })
}
