import { ServerRenderingBenchmarkSchema } from './schemas.ts'
import { summarizeMetric } from './sample-statistics.ts'
import type { RenderedTestSample } from './types.ts'

export function assembleServerRendering(iterations: RenderedTestSample[]) {
  return ServerRenderingBenchmarkSchema.parse({
    name: 'serverSideRendered',
    runs: iterations.length,
    iterations,
    firstPaintMs: summarizeMetric(
      iterations.map((value) => value.firstPaintMs),
    ),
    fcpMs: summarizeMetric(iterations.map((value) => value.fcpMs)),
    interactionTests: {
      scenario: 'first-row-detail-navigation',
      source: 'lighthouse-inp-breakdown',
      ...Object.fromEntries(
        [
          'interactionLatencyMs',
          'inputDelayMs',
          'processingDurationMs',
          'presentationDelayMs',
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
