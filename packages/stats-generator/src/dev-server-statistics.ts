import { summarizeMetric } from './sample-statistics.ts'
import { DevServerStatsSchema } from './schemas.ts'

export function createDevServerStats(samples: number[]) {
  return DevServerStatsSchema.parse({
    devServerStartTime: {
      name: 'devServer',
      runs: samples.length,
      iterations: samples.map((timeMs) => ({ timeMs })),
      timeMs: summarizeMetric(samples),
    },
  })
}
