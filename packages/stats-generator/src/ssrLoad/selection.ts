interface PeakCandidate {
  errors: number
  requestsPerSec: number
}

export function getLoadPeakStage<T extends PeakCandidate>(
  stages: readonly T[],
): T {
  const peak = stages.reduce<T | undefined>(
    (best, stage) =>
      stage.errors === 0 &&
      (best === undefined || stage.requestsPerSec > best.requestsPerSec)
        ? stage
        : best,
    undefined,
  )
  if (peak === undefined)
    throw new Error(
      'No valid SSR load peak: no stage completed with zero errors.',
    )
  return peak
}

export function selectRepresentativeIteration(
  iterations: readonly (readonly PeakCandidate[])[],
): number {
  if (iterations.length === 0 || iterations.length % 2 === 0) {
    throw new Error('Expected an odd, nonzero number of load sweeps.')
  }
  return iterations
    .map((sweep, index) => ({
      index,
      peak: getLoadPeakStage(sweep).requestsPerSec,
    }))
    .sort((a, b) => a.peak - b.peak)[Math.floor(iterations.length / 2)]!.index
}
