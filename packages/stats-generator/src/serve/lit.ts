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

spawnProductionServer([join(appDir, 'server.js')], appDir, {
  HOST,
  PORT: String(PORT),
})
