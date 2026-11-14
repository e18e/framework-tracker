import { renderedSampleMetrics } from './rendered-sample-metrics.ts'
import { ServerRenderingBenchmarkSchema } from '@framework-performance/results'
import { summarizeMetric } from './sample-statistics.ts'
import type { RenderedTestSample } from './types.ts'

export function assembleServerRendering(iterations: RenderedTestSample[]) {
  return ServerRenderingBenchmarkSchema.parse({
    name: 'serverSideRendered',
    runs: iterations.length,
    iterations: iterations.map(renderedSampleMetrics),
    firstPaint: summarizeMetric(iterations.map((value) => value.firstPaint)),
    firstContentfulPaint: summarizeMetric(
      iterations.map((value) => value.firstContentfulPaint),
    ),
    interactionTests: {
      ...Object.fromEntries(
        [
          'interactionLatency',
          'inputDelay',
          'processingDuration',
          'presentationDelay',
        ].map((key) => [
          key,
          summarizeMetric(
            iterations.map(
              (value) =>
                value.interactionTests[
                  key as keyof RenderedTestSample['interactionTests']
                ],
            ),
          ),
        ]),
      ),
    },
  })
}
