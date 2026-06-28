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
