/**
 * Serve a TanStack Start app (SSR or SPA mode).
 *
 * Automatically detects the build mode by checking for _shell.html:
 *   SPA build  → dist/client/_shell.html exists  → static + _shell.html fallback
 *   SSR build  → .output/ exists                 → static + Nitro middleware
 *
 * Usage: node tanstack-start.ts <app-dir>
 */
import { createServer } from 'node:http'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import {
  getPort,
  parseAppDir,
  tryServeFile,
  serveFallback,
  registerShutdown,
} from './common.ts'

const appDir = parseAppDir()
const PORT = getPort()

const spaDir = join(appDir, 'dist', 'client')
const ssrPublicDir = join(appDir, '.output', 'public')
const isSpa = existsSync(join(spaDir, '_shell.html'))
const publicDir = isSpa ? spaDir : ssrPublicDir

let middleware: ((req: unknown, res: unknown) => void) | undefined
if (!isSpa) {
  const mod = await import(
    pathToFileURL(join(appDir, '.output', 'server', 'index.mjs')).href
  )
  middleware = mod.middleware
}

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', `http://localhost:${PORT}`)

  if (tryServeFile(publicDir, pathname, req, res)) return

  if (isSpa) {
    serveFallback(join(spaDir, '_shell.html'), req, res)
    return
  }

  middleware!(req, res)
}).listen(PORT, () => {
  console.log(`Ready at http://localhost:${PORT}`)
})

registerShutdown(server)
