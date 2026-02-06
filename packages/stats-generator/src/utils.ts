import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { getFrameworks } from './get-frameworks.ts'
import type { FrameworkConfig } from './types.ts'

/**
 * Get directory size in bytes using du command.
 * Works on both Linux and macOS.
 */
export function getDirectorySize(dirPath: string): number {
  try {
    const output = execFileSync('du', ['-sk', dirPath], { encoding: 'utf-8' })
    const sizeKb = parseInt(output.split(/\s+/)[0], 10)
    return sizeKb * 1024
  } catch (error) {
    console.warn(`Warning: Could not get directory size for ${dirPath}:`, error)
    return 0
  }
}

/**
 * Read and parse a JSON file. Returns null if file doesn't exist or can't be parsed.
 */
export function readJsonFile<T>(filePath: string): T | null {
  try {
    if (!existsSync(filePath)) {
      return null
    }
    const content = readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as T
  } catch (error) {
    console.warn(`Warning: Failed to read ${filePath}:`, error)
    return null
  }
}

/**
 * Write data to a JSON file, creating directories if needed.
 */
export function writeJsonFile(filePath: string, data: unknown): void {
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(filePath, JSON.stringify(data, null, 2))
}

/**
 * Find a framework by package name and validate it exists.
 * Exits with error if not found.
 */
export async function getFrameworkByPackage(
  packageName: string,
): Promise<FrameworkConfig> {
  const frameworks = await getFrameworks()
  const framework = frameworks.find((f) => f.package === packageName)

  if (!framework) {
    console.error(`Unknown package: ${packageName}`)
    process.exit(1)
  }

  return framework
}

/**
 * Parse command line arguments for benchmark scripts.
 */
export function parseArgs(usage: string): {
  packageName: string
  args: string[]
} {
  const packageName = process.argv[2]

  if (!packageName) {
    console.error(usage)
    process.exit(1)
  }

  return { packageName, args: process.argv.slice(3) }
}
