import { join } from 'node:path'
import {
  getHost,
  getPort,
  parseAppDir,
  spawnProductionServer,
} from './common.ts'

const appDir = parseAppDir()
const HOST = getHost()
const PORT = getPort(8000)
const entryPath = join(appDir, 'server.ts')

spawnProductionServer([entryPath], appDir, {
  HOST,
  PORT: String(PORT),
})
