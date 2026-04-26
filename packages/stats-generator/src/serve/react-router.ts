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

const appRequire = createRequire(join(appDir, 'package.json'))
const rrNodePath = appRequire.resolve('@react-router/node')
const { createRequestListener } = await import(pathToFileURL(rrNodePath).href)
const build = await import(buildUrl)
const handler = createRequestListener({ build, mode: 'production' })

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', `http://localhost:${PORT}`)

  if (tryServeFile(staticDir, pathname, req, res)) return

  handler(req, res)
}).listen(PORT, () => {
  console.log(`Ready at http://localhost:${PORT}`)
})

registerShutdown(server)
