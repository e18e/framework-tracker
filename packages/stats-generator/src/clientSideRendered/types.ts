export interface ClientSideRenderedRunResult {
  firstPaintMs: number | null
  fcpMs: number | null
  inpMs: number | null
}

export interface ClientSideRenderedBenchmarkResult {
  name: string
  displayName: string
  package: string
  browserVersion?: string
  clientSideRenderedTests: {
    firstPaintMs: number
    fcpMs: number
    inpMs: number
    runs: number
  }
}

export interface ClientSideRenderedStats {
  timingMeasuredAt: string
  runner: string
  browserVersion?: string
  frameworkVersion?: string
  clientSideRenderedTests: {
    firstPaintMs: number
    fcpMs: number
    inpMs: number
    runs: number
  }
}
