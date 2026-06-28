import { createServer } from 'node:http'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import {
  getPort,
  parseAppDir,
  tryServeFile,
  serveFallback,
  shouldServeHtmlFallback,
  serveNotFound,
  registerShutdown,
} from './common.ts'

const appDir = parseAppDir()
const PORT = getPort()
const mode = process.argv[3] as
  | 'client-side-rendered'
  | 'server-side-rendered'
  | undefined

const spaDir = join(appDir, 'dist', 'client')
const ssrPublicDir = join(appDir, '.output', 'public')
const isClientSideRendered =
  mode === 'client-side-rendered' ||
  (mode !== 'server-side-rendered' && existsSync(join(spaDir, '_shell.html')))
const publicDir = isClientSideRendered ? spaDir : ssrPublicDir

if (isClientSideRendered) {
  const server = createServer((req, res) => {
    const { pathname } = new URL(req.url ?? '/', `http://localhost:${PORT}`)

    if (tryServeFile(publicDir, pathname, req, res)) return

    if (shouldServeHtmlFallback(pathname, req)) {
      serveFallback(join(spaDir, '_shell.html'), req, res)
      return
    }

    serveNotFound(res)
  }).listen(PORT, () => {
    console.log(`Ready at http://localhost:${PORT}`)
  })

  registerShutdown(server)
} else {
  const mod = await import(
    pathToFileURL(join(appDir, '.output', 'server', 'index.mjs')).href
  )

  if (typeof mod.middleware === 'function') {
    const server = createServer((req, res) => {
      const { pathname } = new URL(req.url ?? '/', `http://localhost:${PORT}`)

      if (tryServeFile(publicDir, pathname, req, res)) return

      mod.middleware(req, res)
    }).listen(PORT, () => {
      console.log(`Ready at http://localhost:${PORT}`)
    })

    registerShutdown(server)
  }
}
