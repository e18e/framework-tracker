export interface SPARunResult {
  firstPaintMs: number | null
  fcpMs: number | null
  inpMs: number
}

export interface SPABenchmarkResult {
  name: string
  displayName: string
  package: string
  spaFirstPaintMs: number
  spaFCPMs: number
  spaINPMs: number
  spaRuns: number
}

export interface SPAStats {
  timingMeasuredAt: string
  runner: string
  frameworkVersion?: string
  spaFirstPaintMs: number
  spaFCPMs: number
  spaINPMs: number
  spaRuns: number
}
