/**
 * Production server for SPA benchmarking.
 * Serves static assets from dist/client/ and passes all other
 * requests through the Astro middleware handler.
 */
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const PORT = parseInt(process.env.PORT ?? '4321', 10)
const clientDir = join(__dirname, 'dist', 'client')

const { handler } = await import('./dist/server/entry.mjs')

const MIME_TYPES = {
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

createServer((req, res) => {
  const urlPath = (req.url ?? '/').split('?')[0]
  const filePath = join(clientDir, urlPath)

  try {
    if (existsSync(filePath) && statSync(filePath).isFile()) {
      const contentType =
        MIME_TYPES[extname(filePath)] ?? 'application/octet-stream'
      res.setHeader('Content-Type', contentType)
      createReadStream(filePath).pipe(res)
      return
    }
  } catch {
    // not a static file, fall through
  }

  handler(req, res, () => {
    res.writeHead(404)
    res.end('Not Found')
  })
}).listen(PORT, () => {
  console.log(`Ready at http://localhost:${PORT}`)
})
