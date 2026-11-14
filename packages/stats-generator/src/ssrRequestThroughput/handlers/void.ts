import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { packagesDir } from '../../constants.ts'
import type { ServerRenderHandler } from '../types.ts'

export async function buildVoidHandler(): Promise<ServerRenderHandler> {
  const entryPath = join(packagesDir, 'app-void', 'dist', 'ssr', 'app.js')
  const { default: app } = await import(pathToFileURL(entryPath).href)
  return { type: 'web', handler: (request) => app.fetch(request) }
}
