import { createRequire } from 'node:module'
import { join } from 'node:path'
import { getPort, parseAppDir, spawnProductionServer } from './common.ts'

const appDir = parseAppDir()
const PORT = getPort()

const appRequire = createRequire(join(appDir, 'package.json'))
const nextBinPath = appRequire.resolve('next/dist/bin/next')

spawnProductionServer(
  [nextBinPath, 'start', '--port', String(PORT), '--hostname', 'localhost'],
  appDir,
  { PORT: String(PORT) },
)
