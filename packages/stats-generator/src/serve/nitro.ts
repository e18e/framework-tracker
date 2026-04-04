/**
 * Serve a Nitro-based SSR app (Nuxt, SolidStart).
 *
 * Build output layout:
 *   .output/public/   — static assets
 *   .output/server/index.mjs — Nitro server entry (exports `listener`)
 *
 * Usage: node nitro.ts <app-dir>
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
const PORT = getPort()
const publicDir = join(appDir, '.output', 'public')

const { listener } = await import(
  pathToFileURL(join(appDir, '.output', 'server', 'index.mjs')).href
)

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', `http://localhost:${PORT}`)

  if (tryServeFile(publicDir, pathname, req, res)) return

  listener(req, res)
}).listen(PORT, () => {
  console.log(`Ready at http://localhost:${PORT}`)
})

registerShutdown(server)
