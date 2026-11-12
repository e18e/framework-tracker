import type { z } from 'zod'
import type {
  SSRRequestThroughputStatsSchema,
  FrameworkResult,
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
  InitialLoadStatsSchema,
} from '@framework-performance/results'
import type { SSRLoadTests } from './ssrLoad/types.ts'
export type {
  FrameworkConfig,
  TestConfig,
} from '@framework-performance/results/frameworks-config'

export interface InteractionTiming {
  interactionLatency: number
  inputDelay: number
  processingDuration: number
  presentationDelay: number
}

export interface RenderedTestSample {
  firstPaint: number
  firstContentfulPaint: number
  interactionTests: InteractionTiming
}

export interface CIStats {
  initialLoad?: z.infer<typeof InitialLoadStatsSchema>
  framework?: string
  packagePath?: string
  timingMeasuredAt?: string
  runner?: string
  browserVersion?: string
  frameworkVersion?: string
  releasedAt?: string
  install?: z.infer<typeof InstallBenchmarkSchema>
  coldBuild?: z.infer<typeof BuildStatsSchema>['coldBuild'] | TimeStat
  warmBuild?: z.infer<typeof BuildStatsSchema>['warmBuild'] | TimeStat
  devServer?: DevServerStats['devServer'] | TimeStat
  testTime?: FrameworkResult['testTime']
  // Direct SSR request throughput stats
  ssrRequestThroughput?: z.infer<
    typeof SSRRequestThroughputStatsSchema
  >['ssrRequestThroughput']
  // Real server SSR load stats
  ssrLoad?: SSRLoadTests
  ssrRouterLinkLoad?: CIStats['ssrLoad']
  // Client-side rendered stats (browser paint + interaction timings)
  clientSideRendered?:
    | z.infer<typeof ClientRenderingBenchmarkSchema>
    | z.infer<typeof LegacyRenderedTestsSchema>
  // Server-side rendered route stats (browser paint + interaction timings)
  serverSideRendered?:
    | z.infer<typeof ServerRenderingBenchmarkSchema>
    | z.infer<typeof LegacyRenderedTestsSchema>
  // Core-js vendored polyfill stats
  vendoredCoreJsSize?: FrameworkResult['vendoredCoreJsSize']
  vendoredCoreJsUnnecessaryModules?: string[]
  // Browser baseline stats
  browserBaseline?: BrowserBaselineStats
  // Minimum Node version across the installed dependency tree
  minimumNodeVersion?: string
  minimumNodeVersionImposedBy?: string[]
  // Dependency stats (from e18e analysis)
  coreJs?: CoreJsStats
  nodeEngines?: Pick<
    z.infer<typeof NodeEnginesStatsSchema>,
    'name' | 'minimumNodeVersion' | 'imposedBy'
  > &
    Partial<z.infer<typeof NodeEnginesStatsSchema>>
  dependencies?: z.infer<typeof DependencyScanSchema>
  productionDependencyCount?: FrameworkResult['productionDependencyCount']
  developmentDependencyCount?: FrameworkResult['developmentDependencyCount']
  totalDependencyCount?: FrameworkResult['totalDependencyCount']
  frameworkDependencies?: DependencyStats
  firstPartyDependencies?: FirstPartyDependencyStats
  duplicateDependencyCount?: FrameworkResult['duplicateDependencyCount']
  dependencyInstallSize?: FrameworkResult['dependencyInstallSize']
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
