import { frameworksConfig } from './frameworks.ts'
import type { FrameworkConfig } from './types.ts'

export async function getFrameworks(): Promise<FrameworkConfig[]> {
  return frameworksConfig
}
