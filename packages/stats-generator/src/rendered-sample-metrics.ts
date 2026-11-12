import type { RenderedTestSample } from './types.ts'

export function renderedSampleMetrics(sample: RenderedTestSample) {
  const timing = sample.interactionTests
  return {
    firstPaintMs: { value: sample.firstPaintMs, unit: 'ms' },
    fcpMs: { value: sample.fcpMs, unit: 'ms' },
    interactionTests: {
      interactionLatencyMs: { value: timing.interactionLatencyMs, unit: 'ms' },
      inputDelayMs: { value: timing.inputDelayMs, unit: 'ms' },
      processingDurationMs: { value: timing.processingDurationMs, unit: 'ms' },
      presentationDelayMs: { value: timing.presentationDelayMs, unit: 'ms' },
    },
  }
}
