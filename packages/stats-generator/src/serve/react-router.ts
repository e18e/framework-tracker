import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  getPort,
  parseAppDir,
  tryServeFile,
  registerShutdown,
} from './common.ts'

const appDir = parseAppDir()
const PORT = getPort()
const staticDir = join(appDir, 'build', 'client')
const buildPath = join(appDir, 'build', 'server', 'index.js')
const buildUrl = pathToFileURL(buildPath).href

// Resolve react-router from the app's own node_modules, not the stats-generator's.
const appRequire = createRequire(join(appDir, 'package.json'))
const rrPath = appRequire.resolve('react-router')
const { createRequestHandler } = await import(pathToFileURL(rrPath).href)
const build = await import(buildUrl)
const handler = createRequestHandler(build, 'production')

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? '/', `http://localhost:${PORT}`)

  if (tryServeFile(staticDir, pathname, req, res)) return

  const headers = new Headers(
    Object.fromEntries(
      Object.entries(req.headers).map(([k, v]) => [
        k,
        Array.isArray(v) ? v.join(', ') : (v ?? ''),
      ]),
    ),
  )
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
  const webReq = new Request(`http://localhost:${PORT}${req.url ?? '/'}`, {
    method: req.method,
    headers,
    body: hasBody ? req : null,
    duplex: 'half',
  })

  const webRes: Response = await handler(webReq)

  res.writeHead(webRes.status, Object.fromEntries(webRes.headers.entries()))

  if (webRes.body) {
    for await (const chunk of webRes.body) {
      res.write(chunk)
    }
  }

  res.end()
}).listen(PORT, () => {
  console.log(`Ready at http://localhost:${PORT}`)
})

registerShutdown(server)
