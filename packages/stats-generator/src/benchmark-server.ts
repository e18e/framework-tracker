import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { packagesDir } from './constants.ts'
import type { ServingFrameworkConfig } from './serving-frameworks.ts'

export async function waitForBenchmarkServer(
  url: string,
  signal: AbortSignal,
): Promise<void> {
  while (true) {
    signal.throwIfAborted()
    try {
      const response = await fetch(url, { signal })
      await response.body?.cancel()
      if (response.status === 200) return
    } catch {
      signal.throwIfAborted()
    }
    await sleep(500, undefined, { signal })
  }
}

export async function startBenchmarkServer(
  config: Pick<ServingFrameworkConfig, 'package' | 'serveScript'>,
  options: {
    host: string
    port: number
    readinessPath: string
    timeoutMs?: number
  },
): Promise<() => void> {
  const { host, port, readinessPath, timeoutMs = 30_000 } = options
  const scriptPath = fileURLToPath(
    new URL(`./serve/${config.serveScript}`, import.meta.url),
  )
  const proc = spawn(
    process.execPath,
    [scriptPath, join(packagesDir, config.package)],
    {
      env: {
        ...process.env,
        HOST: host,
        NODE_ENV: 'production',
        PORT: String(port),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  proc.stdout.on('data', (chunk: Buffer) =>
    process.stdout.write(`[${config.package}] ${chunk}`),
  )
  proc.stderr.on('data', (chunk: Buffer) =>
    process.stderr.write(`[${config.package}] ${chunk}`),
  )

  const lifecycle = new AbortController()
  proc.once('error', (error) => lifecycle.abort(error))
  proc.once('exit', (code, signal) => {
    lifecycle.abort(
      new Error(`Server process exited with ${signal ?? `code ${code}`}`),
    )
  })
  const stop = () => {
    lifecycle.abort(new Error('Server stopped'))
    if (proc.exitCode === null && proc.signalCode === null) proc.kill('SIGTERM')
  }
  const url = `http://${host}:${port}${readinessPath}`
  try {
    await waitForBenchmarkServer(
      url,
      AbortSignal.any([lifecycle.signal, AbortSignal.timeout(timeoutMs)]),
    )
  } catch (error) {
    stop()
    throw new Error(
      `Server at ${url} failed to become ready within ${timeoutMs}ms`,
      { cause: error },
    )
  }
  return stop
}
