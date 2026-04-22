export interface MPARunResult {
  firstPaintMs: number | null
  fcpMs: number | null
  inpMs: number | null
}

export interface MPABenchmarkResult {
  name: string
  displayName: string
  package: string
  mpaFirstPaintMs: number
  mpaFCPMs: number
  mpaINPMs: number
  mpaRuns: number
}

export interface MPAStats {
  timingMeasuredAt: string
  runner: string
  frameworkVersion?: string
  mpaFirstPaintMs: number
  mpaFCPMs: number
  mpaINPMs: number
  mpaRuns: number
}
