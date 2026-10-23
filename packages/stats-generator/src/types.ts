import type { z } from 'zod'
import type {
  SSRRequestThroughputStatsSchema,
  BuildStatsSchema,
  DependencyCountsSchema,
  DependencyScanSchema,
  FirstPartyDependencyScanSchema,
  CoreJsStatsSchema,
  BrowserBaselineStatsSchema,
  NodeEnginesStatsSchema,
  ClientRenderingBenchmarkSchema,
  ServerRenderingBenchmarkSchema,
  LegacyRenderedTestsSchema,
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
  ssrRequestThroughputTests?: z.infer<
    typeof SSRRequestThroughputStatsSchema
  >['ssrRequestThroughputTests']
  // Real server SSR load stats
  ssrLoadTests?: SSRLoadTests
  ssrRouterLinkLoadTests?: CIStats['ssrLoadTests']
  // Client-side rendered stats (browser paint + interaction timings)
  clientSideRenderedTests?:
    | z.infer<typeof ClientRenderingBenchmarkSchema>
    | {
        firstPaintMs: number
        fcpMs: number
        inpMs?: number
        interactionTests?: InteractionTestStats
        runs: number
        standardDeviation?: RenderedTestStandardDeviation
        samples?: RenderedTestSample[]
      }
  // Server-side rendered route stats (browser paint + interaction timings)
  serverSideRenderedTests?:
    | z.infer<typeof ServerRenderingBenchmarkSchema>
    | z.infer<typeof LegacyRenderedTestsSchema>
  // Core-js vendored polyfill stats
  vendoredCoreJsSize?: number
  vendoredCoreJsUnnecessaryModules?: string[]
  // Browser baseline stats
  browserBaselineTests?: BrowserBaselineStats
  // Minimum Node version across the installed dependency tree
  minimumNodeVersion?: string
  minimumNodeVersionImposedBy?: string[]
  // Dependency stats (from e18e analysis)
  corejs?: CoreJsStats
  nodeEngines?: Pick<
    z.infer<typeof NodeEnginesStatsSchema>,
    'name' | 'minimumNodeVersion' | 'imposedBy'
  > &
    Partial<z.infer<typeof NodeEnginesStatsSchema>>
  dependencyScan?: z.infer<typeof DependencyScanSchema>
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

export type DependencyStats = z.infer<typeof DependencyCountsSchema>
export type FirstPartyDependencyStats = z.infer<
  typeof FirstPartyDependencyScanSchema
>

export type InstallResult = z.infer<typeof InstallResultSchema>

export type BuildStats = z.infer<typeof BuildStatsSchema>

export type DevServerStats = z.infer<typeof DevServerStatsSchema>

export type CoreJsStats = z.infer<typeof CoreJsStatsSchema>
export type BrowserBaselineStats = z.infer<typeof BrowserBaselineStatsSchema>
export type NodeEnginesStats = z.infer<typeof NodeEnginesStatsSchema>

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
