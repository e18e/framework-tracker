export interface SSRLoadStageStats {
  workers: number
  durationMs: number
  requests: number
  errors: number
  requestsPerSec: number
  avgLatencyMs: number
  medianLatencyMs: number
  p50LatencyMs: number
  p75LatencyMs: number
  p90LatencyMs: number
  p99LatencyMs: number
  maxLatencyMs: number
  bytesPerSec: number
}

export interface SSRLoadSweep {
  peakWorkers: number
  peakRequestsPerSec: number
  peakAvgLatencyMs: number
  peakP50LatencyMs: number
  peakP75LatencyMs: number
  peakP90LatencyMs: number
  peakP99LatencyMs: number
  totalRequests: number
  totalErrors: number
  stages: SSRLoadStageStats[]
}

export interface SSRLoadTests extends SSRLoadSweep {
  runs?: number
  samples?: SSRLoadSweep[]
  warmupDurationMs?: number
}

export interface SSRLoadBenchmarkResult {
  name: string
  displayName: string
  package: string
  tests: SSRLoadTests
}
