import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const PORT = parseInt(process.env.PORT ?? '3000', 10)

const spaClientDir = join(__dirname, 'dist', 'client')
const ssrPublicDir = join(__dirname, '.output', 'public')

// Auto-detect: SPA build outputs _shell.html to dist/client; SSR build uses .output
const isSpa = existsSync(join(spaClientDir, '_shell.html'))
const publicDir = isSpa ? spaClientDir : ssrPublicDir

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

let middleware
if (!isSpa) {
  const mod = await import('./.output/server/index.mjs')
  middleware = mod.middleware
}

createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const filePath = join(publicDir, url.pathname)

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    const ext = extname(filePath)
    res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream')
    createReadStream(filePath).pipe(res)
    return
  }

  if (isSpa) {
    const shell = join(publicDir, '_shell.html')
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    createReadStream(shell).pipe(res)
    return
  }

  middleware(req, res)
}).listen(PORT, () => {
  console.log(`Ready at http://localhost:${PORT}`)
})
