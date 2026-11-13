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
const entryPath = join(appDir, 'server.mjs')

spawnProductionServer([entryPath], appDir, {
  HOST,
  PORT: String(PORT),
  NIFRA_ALLOW_MEMORY_RATE_LIMIT: 'true',
})
