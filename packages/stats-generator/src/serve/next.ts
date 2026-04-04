import { createServer } from 'node:http'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { getPort, parseAppDir, registerShutdown } from './common.ts'

const appDir = parseAppDir()
const PORT = getPort()

const nextEntry = join(
  appDir,
  'node_modules',
  'next',
  'dist',
  'server',
  'next.js',
)
const { default: next } = await import(pathToFileURL(nextEntry).href)

const app = next({ dev: false, hostname: 'localhost', port: PORT, dir: appDir })
await app.prepare()
const handler = app.getRequestHandler()

const server = createServer((req, res) => handler(req, res)).listen(
  PORT,
  () => {
    console.log(`Ready at http://localhost:${PORT}`)
  },
)

registerShutdown(server)
