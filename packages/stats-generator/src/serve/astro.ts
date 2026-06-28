import { join } from 'node:path'
import { getPort, parseAppDir, spawnProductionServer } from './common.ts'

const appDir = parseAppDir()
const PORT = getPort(4321)
const entryPath = join(appDir, 'dist', 'server', 'entry.mjs')

spawnProductionServer([entryPath], appDir, { PORT: String(PORT) })
