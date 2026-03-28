import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const PORT = parseInt(process.env.PORT ?? '3000', 10)
const clientDir = join(__dirname, 'build', 'client')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
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
      const ext = extname(filePath)
      res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream')
      createReadStream(filePath).pipe(res)
      return
    }
  } catch {
    // not a static file, fall through to SPA index
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  createReadStream(join(clientDir, 'index.html')).pipe(res)
}).listen(PORT, () => {
  console.log(`Ready at http://localhost:${PORT}`)
})
