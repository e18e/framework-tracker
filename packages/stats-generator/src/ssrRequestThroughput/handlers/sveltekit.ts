import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { packagesDir } from '../../constants.ts'
import type { ServerRenderHandler } from '../types.ts'

export async function buildSvelteKitHandler(): Promise<ServerRenderHandler> {
  const entryPath = join(packagesDir, 'app-sveltekit', 'build', 'handler.js')
  const entryUrl = pathToFileURL(entryPath).href
  const { handler } = await import(entryUrl)
  return { type: 'node', handler }
}
