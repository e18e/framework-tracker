import { createServer } from 'node:http'
import { join } from 'node:path'
import {
  getPort,
  parseAppDir,
  tryServeFile,
  serveFallback,
  registerShutdown,
} from './common.ts'

const appDir = parseAppDir()
const staticSubDir = process.argv[3] ?? 'build/client'
const fallbackFile = process.argv[4] ?? 'index.html'

const PORT = getPort()
const staticDir = join(appDir, staticSubDir)
const fallbackPath = join(staticDir, fallbackFile)

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', `http://localhost:${PORT}`)

  if (tryServeFile(staticDir, pathname, req, res)) return

  serveFallback(fallbackPath, req, res)
}).listen(PORT, () => {
  console.log(`Ready at http://localhost:${PORT}`)
})

registerShutdown(server)
