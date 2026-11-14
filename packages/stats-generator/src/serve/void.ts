import { join } from 'node:path'
import {
  getHost,
  getPort,
  parseAppDir,
  spawnProductionServer,
} from './common.ts'

const appDir = parseAppDir()

spawnProductionServer([join(appDir, 'dist', 'ssr', 'index.js')], appDir, {
  HOST: getHost(),
  PORT: String(getPort()),
})
