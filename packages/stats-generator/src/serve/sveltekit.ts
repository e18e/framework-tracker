import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseAppDir } from './common.ts'

const appDir = parseAppDir()

await import(pathToFileURL(join(appDir, 'build', 'index.js')).href)
