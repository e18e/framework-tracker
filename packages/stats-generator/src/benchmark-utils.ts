import { execFileSync } from 'node:child_process'

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
