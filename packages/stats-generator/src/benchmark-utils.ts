import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { packagesDir } from './constants.ts'

export function parseRunFrequency(
  value: string | undefined,
  fallback = 5,
): number {
  const runFrequency = value === undefined ? fallback : Number(value)

  if (!Number.isInteger(runFrequency) || runFrequency < 1) {
    throw new Error(`Run frequency must be a positive integer: ${value}`)
  }

  return runFrequency
}

export function installDependencies(
  cwd: string,
  storeDir: string,
  cacheDir: string,
): void {
  execFileSync(
    'pnpm',
    [
      'install',
      '--frozen-lockfile',
      '--store-dir',
      storeDir,
      '--cache-dir',
      cacheDir,
    ],
    {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  )
}

export function copyTrackedProject(
  sourceDir: string,
  projectDir: string,
): void {
  const repositoryDir = join(packagesDir, '..')
  const sourcePathFromRepository = relative(repositoryDir, sourceDir)
  const trackedPaths = execFileSync(
    'git',
    ['ls-files', '-z', '--', sourcePathFromRepository],
    {
      cwd: repositoryDir,
      encoding: 'utf-8',
    },
  )
    .split('\0')
    .filter(Boolean)

  for (const trackedPath of trackedPaths) {
    const projectPath = relative(sourcePathFromRepository, trackedPath)
    const destinationPath = join(projectDir, projectPath)
    mkdirSync(dirname(destinationPath), { recursive: true })
    cpSync(join(repositoryDir, trackedPath), destinationPath)
  }
}
