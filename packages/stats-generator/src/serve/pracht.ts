import { join } from 'node:path'
import {
  getHost,
  getPort,
  parseAppDir,
  spawnProductionServer,
} from './common.ts'

const appDir = parseAppDir()
const HOST = getHost()
const PORT = getPort()
const entryPath = join(appDir, 'dist', 'server', 'server.js')

spawnProductionServer([entryPath], appDir, {
  HOST,
  PORT: String(PORT),
})
