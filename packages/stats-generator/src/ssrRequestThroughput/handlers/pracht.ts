import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { packagesDir } from '../../constants.ts'
import type { ServerRenderHandler } from '../types.ts'

export async function buildPrachtHandler(): Promise<ServerRenderHandler> {
  const entryPath = join(
    packagesDir,
    'app-pracht',
    'dist',
    'server',
    'server.js',
  )
  const entryUrl = pathToFileURL(entryPath).href

  // The generated entry only calls `listen()` when it is the process
  // entrypoint, so importing it here yields the handler without a server.
  const { handler } = await import(entryUrl)
  return { type: 'node', handler }
}
