export interface ServerSideRenderedRunResult {
  firstPaintMs: number | null
  fcpMs: number | null
  inpMs: number | null
}

export interface ServerSideRenderedBenchmarkResult {
  name: string
  displayName: string
  package: string
  browserVersion?: string
  serverSideRenderedTests: {
    firstPaintMs: number
    fcpMs: number
    inpMs: number
    runs: number
  }
}

export interface ServerSideRenderedStats {
  timingMeasuredAt: string
  runner: string
  browserVersion?: string
  frameworkVersion?: string
  serverSideRenderedTests: {
    firstPaintMs: number
    fcpMs: number
    inpMs: number
    runs: number
  }
}
