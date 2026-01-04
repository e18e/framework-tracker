export interface FrameworkStats {
  prodDependencies: number
  devDependencies: number
}

export interface StatsMap {
  [key: string]: FrameworkStats
}

export interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}
