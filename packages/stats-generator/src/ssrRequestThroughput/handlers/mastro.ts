import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { packagesDir } from '../../constants.ts'
import type { ServerRenderHandler } from '../types.ts'

export async function buildMastroHandler(): Promise<ServerRenderHandler> {
  const entryPath = join(packagesDir, 'app-mastro', 'server.ts')
  const entryUrl = pathToFileURL(entryPath).href
  const { handler } = await import(entryUrl)
  return { type: 'web', handler }
}
