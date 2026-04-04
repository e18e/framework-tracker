import { createReadStream, statSync } from 'node:fs'
import { join, extname, resolve } from 'node:path'
import type { IncomingMessage, ServerResponse, Server } from 'node:http'

export const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

export function getPort(defaultPort = 3000): number {
  return parseInt(process.env.PORT ?? String(defaultPort), 10)
}

export function parseAppDir(): string {
  const appDir = process.argv[2]
  if (!appDir) {
    console.error(`Usage: node ${process.argv[1]} <app-dir>`)
    process.exit(1)
  }
  return appDir
}

/**
 * Attempt to serve a file from staticDir matching the URL pathname.
 * Returns true if the file was served, false if not found or not a file.
 * Handles HEAD requests (headers only, no body).
 * Prevents path traversal attacks.
 */
export function tryServeFile(
  staticDir: string,
  pathname: string,
  req: IncomingMessage,
  res: ServerResponse,
): boolean {
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return false
  }

  const abs = resolve(join(staticDir, decoded))

  // Ensure resolved path stays within staticDir
  if (abs !== staticDir && !abs.startsWith(staticDir + '/')) return false

  try {
    const stat = statSync(abs)
    if (!stat.isFile()) return false

    const contentType = MIME[extname(abs)] ?? 'application/octet-stream'
    res.setHeader('Content-Type', contentType)

    if (req.method === 'HEAD') {
      res.setHeader('Content-Length', stat.size)
      res.end()
    } else {
      createReadStream(abs).pipe(res)
    }
    return true
  } catch {
    return false
  }
}

/**
 * Serve a fallback HTML file (e.g. index.html or _shell.html) for SPA routing.
 * Handles HEAD requests correctly.
 */
export function serveFallback(
  fallbackPath: string,
  req: IncomingMessage,
  res: ServerResponse,
): void {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  if (req.method === 'HEAD') {
    res.end()
  } else {
    createReadStream(fallbackPath).pipe(res)
  }
}

/**
 * Register SIGTERM and SIGINT handlers for graceful shutdown.
 * Immediately closes all connections (including keep-alive) then exits.
 */
export function registerShutdown(server: Server): void {
  const shutdown = () => {
    server.closeAllConnections()
    server.close(() => process.exit(0))
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}
