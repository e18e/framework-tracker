import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { packagesDir } from '../../constants.ts'
import type { ServerRenderHandler } from '../types.ts'

export async function buildEmberHandler(): Promise<ServerRenderHandler> {
  const entryPath = join(packagesDir, 'app-ember', 'server.js')
  const { handler } = await import(pathToFileURL(entryPath).href)
  return { type: 'node', handler }
}
