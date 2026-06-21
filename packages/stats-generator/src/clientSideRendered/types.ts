export interface SPARunResult {
  firstPaintMs: number | null
  fcpMs: number | null
  inpMs: number | null
}

export interface SPABenchmarkResult {
  name: string
  displayName: string
  package: string
  clientSideRenderedTests: {
    firstPaintMs: number
    fcpMs: number
    inpMs: number
    runs: number
  }
}

export interface SPAStats {
  timingMeasuredAt: string
  runner: string
  frameworkVersion?: string
  clientSideRenderedTests: {
    firstPaintMs: number
    fcpMs: number
    inpMs: number
    runs: number
  }
}
