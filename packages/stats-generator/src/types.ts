export type MeasurementType = 'install' | 'build' | 'test' | 'dependencies'

export interface FrameworkConfig {
  name: string
  displayName: string
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
  timingMeasuredAt?: string
  runner?: string
}

export interface FrameworkStats extends CIStats {
  name?: string
  package?: string
  type?: string
  prodDependencies?: number
  devDependencies?: number
}

export interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}
