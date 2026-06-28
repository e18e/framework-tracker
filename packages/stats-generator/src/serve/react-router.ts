import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import {
  getHost,
  getPort,
  parseAppDir,
  spawnProductionServer,
} from './common.ts'

const appDir = parseAppDir()
const HOST = getHost()
const PORT = getPort()
const buildPath = join(appDir, 'build', 'server', 'index.js')

const appRequire = createRequire(join(appDir, 'package.json'))
const servePackagePath = appRequire.resolve('@react-router/serve/package.json')
const serveBinPath = join(dirname(servePackagePath), 'bin.js')

spawnProductionServer([serveBinPath, buildPath], appDir, {
  HOST,
  PORT: String(PORT),
})
