import { spawn, type ChildProcess } from 'node:child_process'
import { resolve } from 'node:path'
import type { Server } from 'node:http'

export function getPort(defaultPort = 3000): number {
  return Number.parseInt(process.env.PORT ?? String(defaultPort), 10)
}

export function getHost(defaultHost = '127.0.0.1'): string {
  return process.env.HOST ?? defaultHost
}

export function parseAppDir(): string {
  const appDir = process.argv[2]
  if (!appDir) {
    console.error(`Usage: node ${process.argv[1]} <app-dir>`)
    process.exit(1)
  }
  return resolve(appDir)
}

export function spawnProductionServer(
  args: string[],
  appDir: string,
  env: NodeJS.ProcessEnv = {},
): ChildProcess {
  const child = spawn(process.execPath, args, {
    cwd: appDir,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      ...env,
    },
    stdio: 'inherit',
  })

  const shutdown = () => {
    child.kill('SIGTERM')
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  child.on('exit', (code, signal) => {
    process.exit(signal ? 0 : (code ?? 0))
  })

  return child
}

export function registerShutdown(server: Server): void {
  const shutdown = () => {
    server.closeAllConnections()
    server.close(() => process.exit(0))
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}
