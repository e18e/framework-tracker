import { join } from 'node:path'
import {
  getHost,
  getPort,
  parseAppDir,
  spawnProductionServer,
} from './common.ts'

const appDir = parseAppDir()
const HOST = getHost()
const PORT = getPort(4321)
const entryPath = join(appDir, 'dist', 'server', 'entry.mjs')

spawnProductionServer([entryPath], appDir, {
  HOST,
  PORT: String(PORT),
})
