import { join } from 'node:path'
import { getPort, parseAppDir, spawnProductionServer } from './common.ts'

const appDir = parseAppDir()
const PORT = getPort()
const entryPath = join(appDir, 'build', 'index.js')

spawnProductionServer([entryPath], appDir, { PORT: String(PORT) })
