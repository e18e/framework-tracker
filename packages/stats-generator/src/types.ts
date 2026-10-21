import type { z } from 'zod'
import type {
  BuildStatsSchema,
  DevServerStatsSchema,
  InstallBenchmarkSchema,
  InstallResultSchema,
} from './schemas.ts'
import type { SSRLoadTests } from './ssrLoad/types.ts'
type MeasurementType =
  | 'install'
  | 'build'
  | 'devServer'
  | 'test'
  | 'dependencies'
  | 'browserBaseline'
  | 'ssrRequestThroughput'
  | 'ssrLoad'
  | 'ssrRouterLinkLoad'
  | 'clientSideRendered'
  | 'serverSideRendered'

interface MeasurementConfig {
  type: MeasurementType
  runFrequency?: number
}

export interface TestConfig {
  package: string
  buildScript: string
  buildOutputDir: string
  devServerPort?: number
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
  framework?: string
  packagePath?: string
  timingMeasuredAt?: string
  runner?: string
  browserVersion?: string
  frameworkVersion?: string
  releasedAt?: string
  install?: z.infer<typeof InstallBenchmarkSchema>
  coldBuildTime?: z.infer<typeof BuildStatsSchema>['coldBuildTime'] | TimeStat
  warmBuildTime?: z.infer<typeof BuildStatsSchema>['warmBuildTime'] | TimeStat
  devServerStartTime?: DevServerStats['devServerStartTime'] | TimeStat
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
  ssrLoadTests?: SSRLoadTests
  ssrRouterLinkLoadTests?: CIStats['ssrLoadTests']
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
  firstPartyDependencies?: FirstPartyDependencyStats
  duplicateDependencies?: number
  depInstallSize?: number
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

export interface FirstPartyDependencyStats extends DependencyStats {
  duplicateDependencies?: number
}

export type InstallResult = z.infer<typeof InstallResultSchema>

export type BuildStats = z.infer<typeof BuildStatsSchema>

export type DevServerStats = z.infer<typeof DevServerStatsSchema>

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
