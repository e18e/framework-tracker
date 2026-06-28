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
const entryPath = join(appDir, 'build', 'index.js')

spawnProductionServer([entryPath], appDir, {
  HOST,
  PORT: String(PORT),
})
