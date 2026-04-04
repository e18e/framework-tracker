/**
 * Serve an Astro SSR app (adapter-node).
 *
 * Build output layout:
 *   dist/client/   — static assets
 *   dist/server/entry.mjs — Astro server entry (exports `handler`)
 *
 * The Astro handler uses a Node.js middleware signature: (req, res, next).
 *
 * Usage: node astro.ts <app-dir>
 */
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

const { handler } = await import(
  pathToFileURL(join(appDir, 'dist', 'server', 'entry.mjs')).href
)

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', `http://localhost:${PORT}`)

  if (tryServeFile(clientDir, pathname, req, res)) return

  handler(req, res, () => {
    res.writeHead(404)
    res.end('Not Found')
  })
}).listen(PORT, () => {
  console.log(`Ready at http://localhost:${PORT}`)
})

registerShutdown(server)
