import { createServer } from 'node:http'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  getPort,
  parseAppDir,
  tryServeFile,
  registerShutdown,
} from './common.ts'

const appDir = parseAppDir()
const PORT = getPort(4321)
const clientDir = join(appDir, 'dist', 'client')
const entryUrl = pathToFileURL(join(appDir, 'dist', 'server', 'entry.mjs')).href

const previousAutostart = process.env.ASTRO_NODE_AUTOSTART
process.env.ASTRO_NODE_AUTOSTART = 'disabled'

const mod = await import(entryUrl)

if (previousAutostart === undefined) {
  delete process.env.ASTRO_NODE_AUTOSTART
} else {
  process.env.ASTRO_NODE_AUTOSTART = previousAutostart
}

if (typeof mod.handler === 'function') {
  const server = createServer((req, res) => {
    const { pathname } = new URL(req.url ?? '/', `http://localhost:${PORT}`)

    if (tryServeFile(clientDir, pathname, req, res)) return

    mod.handler(req, res, () => {
      res.writeHead(404)
      res.end('Not Found')
    })
  }).listen(PORT, () => {
    console.log(`Ready at http://localhost:${PORT}`)
  })

  registerShutdown(server)
}
