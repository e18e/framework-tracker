import type { RenderedTestSample } from './types.ts'

export function renderedSampleMetrics(sample: RenderedTestSample) {
  const timing = sample.interactionTests
  return {
    firstPaint: { value: sample.firstPaint, unit: 'ms' },
    firstContentfulPaint: { value: sample.firstContentfulPaint, unit: 'ms' },
    interactionTests: {
      interactionLatency: { value: timing.interactionLatency, unit: 'ms' },
      inputDelay: { value: timing.inputDelay, unit: 'ms' },
      processingDuration: { value: timing.processingDuration, unit: 'ms' },
      presentationDelay: { value: timing.presentationDelay, unit: 'ms' },
    },
  }
}
