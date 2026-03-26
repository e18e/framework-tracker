import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const PORT = parseInt(process.env.PORT ?? '3000', 10)
const publicDir = join(__dirname, '.output', 'public')

const MIME = {
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

const { middleware } = await import('./.output/server/index.mjs')

createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const filePath = join(publicDir, url.pathname)

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    const ext = extname(filePath)
    res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream')
    createReadStream(filePath).pipe(res)
    return
  }

  middleware(req, res)
}).listen(PORT, () => {
  console.log(`Ready at http://localhost:${PORT}`)
})
