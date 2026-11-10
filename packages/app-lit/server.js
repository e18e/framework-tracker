// Static file server for the production build. Unknown paths fall back to
// index.html so the client router can handle them.
import { createServer } from 'node:http'
import { readdirSync, readFileSync } from 'node:fs'
import { extname, join } from 'node:path'

const distDir = new URL('./dist/', import.meta.url).pathname
const host = process.env.HOST ?? '127.0.0.1'
const port = Number.parseInt(process.env.PORT ?? '3000', 10)

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
}

const files = new Map(
  readdirSync(distDir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const path = join(entry.parentPath, entry.name)
      return [
        '/' + path.slice(distDir.length),
        {
          body: readFileSync(path),
          type: contentTypes[extname(path)] ?? 'application/octet-stream',
        },
      ]
    }),
)
const index = files.get('/index.html')

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost')
  const file =
    files.get(pathname) ?? (pathname.startsWith('/assets/') ? null : index)

  if (!file) {
    res.writeHead(404).end()
    return
  }

  res.writeHead(200, { 'content-type': file.type })
  res.end(file.body)
}).listen(port, host, () => {
  console.log(`Listening on http://${host}:${port}`)
})

const shutdown = () => {
  server.closeAllConnections()
  server.close(() => process.exit(0))
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
