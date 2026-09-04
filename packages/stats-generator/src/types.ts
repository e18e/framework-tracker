export type MeasurementType =
  | 'install'
  | 'build'
  | 'test'
  | 'dependencies'
  | 'browserBaseline'
  | 'ssrRequestThroughput'
  | 'ssrLoad'
  | 'clientSideRendered'
  | 'serverSideRendered'

export interface MeasurementConfig {
  type: MeasurementType
  runFrequency?: number
}

export interface TestConfig {
  package: string
  buildScript: string
  buildOutputDir: string
  measurements: MeasurementConfig[]
}

export interface InteractionTiming {
  interactionLatencyMs: number
  inputDelayMs: number
  processingDurationMs: number
  presentationDelayMs: number
}

export interface InteractionTestStats extends InteractionTiming {
  scenario: 'first-row-detail-navigation'
  source: 'lighthouse-inp-breakdown'
}

export interface RenderedTestSample {
  firstPaintMs: number
  fcpMs: number
  interactionTests: InteractionTiming
}

export interface RenderedTestStandardDeviation extends InteractionTiming {
  firstPaintMs: number
  fcpMs: number
}

export interface FrameworkConfig {
  name: string
  displayName: string
  frameworkPackage: string
  focusedFramework?: boolean
  starter?: TestConfig
  app?: TestConfig
}

export interface CIStats {
  timingMeasuredAt?: string
  runner?: string
  browserVersion?: string
  frameworkVersion?: string
  // Install stats
  installTime?: TimeStat
  nodeModulesSize?: number
  // Build stats
  coldBuildTime?: TimeStat
  warmBuildTime?: TimeStat
  testTimeMs?: number
  // Direct SSR request throughput stats
  ssrRequestThroughputTests?: {
    opsPerSec: number
    avgLatencyMs: number
    medianLatencyMs: number
    samples: number
    bodySizeKb: number
    duplicationFactor: number
  }
  // Real server SSR load stats
  ssrLoadTests?: {
    peakWorkers: number
    peakRequestsPerSec: number
    peakAvgLatencyMs: number
    peakP50LatencyMs: number
    peakP75LatencyMs: number
    peakP90LatencyMs: number
    peakP99LatencyMs: number
    totalRequests: number
    totalErrors: number
    stages: Array<{
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
    }>
  }
  // Client-side rendered stats (browser paint + interaction timings)
  clientSideRenderedTests?: {
    firstPaintMs: number
    fcpMs: number
    inpMs?: number
    interactionTests?: InteractionTestStats
    runs: number
    standardDeviation?: RenderedTestStandardDeviation
    samples?: RenderedTestSample[]
  }
  // Server-side rendered route stats (browser paint + interaction timings)
  serverSideRenderedTests?: {
    firstPaintMs: number
    fcpMs: number
    inpMs?: number
    interactionTests?: InteractionTestStats
    runs: number
    standardDeviation?: RenderedTestStandardDeviation
    samples?: RenderedTestSample[]
  }
  // Core-js vendored polyfill stats
  vendoredCoreJsSize?: number
  vendoredCoreJsUnnecessaryModules?: string[]
  // Browser baseline stats
  browserBaselineTests?: BrowserBaselineStats
  // Minimum Node version across the installed dependency tree
  minimumNodeVersion?: string
  minimumNodeVersionImposedBy?: string[]
  // Dependency stats (from e18e analysis)
  prodDependencies?: number
  devDependencies?: number
  allDependencies?: number
  frameworkDependencies?: DependencyStats
  duplicateDependencies?: number
  depInstallSize?: number
  e18eMessages?: Array<{
    severity: string
    message: string
    fixableBy?: string
  }>
  // Snapshot of the package.json dependencies at measurement time
  packageJson?: {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }
}

export interface DependencyStats {
  prodDependencies: number
  devDependencies: number
  allDependencies: number
}

export interface InstallStats {
  frameworkVersion: string
  installTime: TimeStat
  nodeModulesSize: number
}

export interface BuildStats {
  coldBuildTime: TimeStat
  warmBuildTime: TimeStat
}

export interface CoreJsStats {
  vendoredFiles: Array<{
    file: string
    version: string
    sizeBytes: number
    unnecessaryModules: string[]
  }>
  totalVendoredBytes: number
  unnecessaryModules: string[]
}

export interface BrowserBaselineStats {
  baselineStatus: 'high' | 'low' | false | null
  baselineYear: number | null
  baselineReason: string | null
  baselineFeatureCount: number
}

export interface NodeEnginesStats {
  minimumNodeVersion: string | null
  imposedBy: string[]
  packagesScanned: number
  packagesDeclaringNodeEngine: number
  unsatisfiableRanges: string[]
}

export interface TimeStat {
  avgMs: number
  standardDeviationMs: number
  minMs: number
  maxMs: number
  samplesMs: number[]
}

export interface FrameworkStats extends CIStats {
  name?: string
  package?: string
  type?: string
  order?: number
  isFocused?: boolean
}

export interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

export interface E18eStats {
  stats: {
    name: string
    version: string
    installSize?: number
    dependencyCount: {
      production: number
      development: number
    }
    extraStats?: Array<{
      name: string
      label?: string
      value: number | string
    }>
  }
  messages: Array<{
    severity: string
    message: string
    fixableBy?: string
  }>
}
