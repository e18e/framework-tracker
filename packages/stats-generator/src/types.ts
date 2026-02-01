export type MeasurementType =
  | 'install'
  | 'build'
  | 'test'
  | 'dependencies'
  | 'ssr'

export type FrameworkType = 'starter' | 'app'

export interface FrameworkConfig {
  name: string
  displayName: string
  type: FrameworkType
  package: string
  buildScript?: string
  testScript?: string
  measurements: MeasurementType[]
}

export interface CIStats {
  installTimeMs?: number
  coldBuildTimeMs?: number
  warmBuildTimeMs?: number
  testTimeMs?: number
  nodeModulesSize?: number
  nodeModulesSizeProdOnly?: number
  timingMeasuredAt?: string
  runner?: string
  // SSR benchmark stats
  ssrOpsPerSec?: number
  ssrAvgLatencyMs?: number
  ssrSamples?: number
  ssrBodySizeKb?: number
  ssrDuplicationFactor?: number
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
