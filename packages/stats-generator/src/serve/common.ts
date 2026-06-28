import { createReadStream, existsSync, statSync } from 'node:fs'
import {
  join,
  extname,
  basename,
  isAbsolute,
  relative,
  resolve,
} from 'node:path'
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
  return Number.parseInt(process.env.PORT ?? String(defaultPort), 10)
}

export function parseAppDir(): string {
  const appDir = process.argv[2]
  if (!appDir) {
    console.error(`Usage: node ${process.argv[1]} <app-dir>`)
    process.exit(1)
  }
  return resolve(appDir)
}

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

  const root = resolve(staticDir)
  const abs = resolve(join(root, decoded))

  // Ensure resolved path stays within staticDir
  const relativePath = relative(root, abs)
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    return false
  }

  try {
    const asset = pickAssetVariant(abs, req)
    const stat = statSync(asset.path)
    if (!stat.isFile()) return false

    const contentType = MIME[extname(abs)] ?? 'application/octet-stream'
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Length', stat.size)
    res.setHeader('Cache-Control', cacheControlFor(abs))
    if (asset.encoding) {
      res.setHeader('Content-Encoding', asset.encoding)
      res.setHeader('Vary', 'Accept-Encoding')
    }

    if (req.method === 'HEAD') {
      res.end()
    } else {
      createReadStream(asset.path).pipe(res)
    }
    return true
  } catch {
    return false
  }
}

export function serveFallback(
  fallbackPath: string,
  req: IncomingMessage,
  res: ServerResponse,
): void {
  const stat = statSync(fallbackPath)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Content-Length', stat.size)
  res.setHeader('Cache-Control', 'no-cache')
  if (req.method === 'HEAD') {
    res.end()
  } else {
    createReadStream(fallbackPath).pipe(res)
  }
}

export function shouldServeHtmlFallback(
  pathname: string,
  req: IncomingMessage,
): boolean {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false

  const accept = req.headers.accept ?? ''
  if (accept.includes('text/html')) return true

  return !extname(pathname) && (accept === '' || accept.includes('*/*'))
}

export function serveNotFound(res: ServerResponse): void {
  res.writeHead(404, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache',
  })
  res.end('Not Found')
}

function pickAssetVariant(
  abs: string,
  req: IncomingMessage,
): { path: string; encoding?: 'br' | 'gzip' } {
  const acceptEncoding = req.headers['accept-encoding'] ?? ''
  const accepted = Array.isArray(acceptEncoding)
    ? acceptEncoding.join(',')
    : acceptEncoding

  if (accepted.includes('br') && existsSync(`${abs}.br`)) {
    return { path: `${abs}.br`, encoding: 'br' }
  }

  if (accepted.includes('gzip') && existsSync(`${abs}.gz`)) {
    return { path: `${abs}.gz`, encoding: 'gzip' }
  }

  return { path: abs }
}

function cacheControlFor(abs: string): string {
  const ext = extname(abs)
  if (ext === '.html' || ext === '.json') return 'no-cache'

  if (isFingerprintedAsset(abs)) {
    return 'public, max-age=31536000, immutable'
  }

  return 'public, max-age=0, must-revalidate'
}

function isFingerprintedAsset(abs: string): boolean {
  const name = basename(abs, extname(abs))
  return /(?:^|[._-])[A-Za-z0-9_-]{8,}$/.test(name)
}

export function registerShutdown(server: Server): void {
  const shutdown = () => {
    server.closeAllConnections()
    server.close(() => process.exit(0))
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}
