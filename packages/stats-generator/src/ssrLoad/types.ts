export interface SSRLoadStageStats {
  workers: number
  durationMs: number
  requests: number
  errors: number
  requestsPerSec: number
  avgLatencyMs: number
  medianLatencyMs: number
  p95LatencyMs: number
  maxLatencyMs: number
  bytesPerSec: number
}

export interface SSRLoadTests {
  peakWorkers: number
  peakRequestsPerSec: number
  peakAvgLatencyMs: number
  peakP95LatencyMs: number
  totalRequests: number
  totalErrors: number
  stages: SSRLoadStageStats[]
}

export interface SSRLoadBenchmarkResult {
  name: string
  displayName: string
  package: string
  ssrLoadTests: SSRLoadTests
}
