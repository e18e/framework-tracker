export type MeasurementType =
  | 'install'
  | 'build'
  | 'test'
  | 'dependencies'
  | 'ssr'

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

export interface FrameworkConfig {
  name: string
  displayName: string
  frameworkPackage: string
  starter?: TestConfig
  app?: TestConfig
}

export interface CIStats {
  timingMeasuredAt?: string
  runner?: string
  frameworkVersion?: string
  // Install stats
  installTime?: TimeStat
  nodeModulesSize?: number
  nodeModulesSizeProdOnly?: number
  // Build stats
  coldBuildTime?: TimeStat
  warmBuildTime?: TimeStat
  buildOutputSize?: number
  testTimeMs?: number
  // SSR stats
  ssrOpsPerSec?: number
  ssrAvgLatencyMs?: number
  ssrSamples?: number
  ssrBodySizeKb?: number
  ssrDuplicationFactor?: number
}

export interface InstallStats {
  frameworkVersion: string
  installTime: TimeStat
  nodeModulesSize: number
  nodeModulesSizeProdOnly: number
}

export interface BuildStats {
  coldBuildTime: TimeStat
  warmBuildTime: TimeStat
  buildOutputSize: number
}

export interface TimeStat {
  avgMs: number
  minMs: number
  maxMs: number
}

export interface FrameworkStats extends CIStats {
  name?: string
  package?: string
  type?: string
  prodDependencies?: number
  devDependencies?: number
  ssrOpsPerSec?: number
  ssrAvgLatencyMs?: number
  ssrSamples?: number
  ssrBodySizeKb?: number
  ssrDuplicationFactor?: number
}

export interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}
