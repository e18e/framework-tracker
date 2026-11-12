import { renderedSampleMetrics } from './rendered-sample-metrics.ts'
import { ClientRenderingBenchmarkSchema } from '@framework-performance/results'
import { summarizeMetric } from './sample-statistics.ts'
import type { RenderedTestSample } from './types.ts'

export function assembleClientRendering(iterations: RenderedTestSample[]) {
  return ClientRenderingBenchmarkSchema.parse({
    name: 'clientSideRendered',
    runs: iterations.length,
    iterations: iterations.map(renderedSampleMetrics),
    firstPaint: summarizeMetric(iterations.map((value) => value.firstPaint)),
    fcp: summarizeMetric(iterations.map((value) => value.fcp)),
    interactionTests: {
      scenario: 'first-row-detail-navigation',
      source: 'lighthouse-inp-breakdown',
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
