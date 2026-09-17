import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { packagesDir } from '../../constants.ts'
import type { ServerRenderHandler } from '../types.ts'

export async function buildNuxtHandler(): Promise<ServerRenderHandler> {
  const entryUrl = pathToFileURL(
    join(packagesDir, 'app-nuxt', '.output', 'server', 'index.mjs'),
  ).href
  const { default: server } = await import(entryUrl)
  return { type: 'web', handler: (request) => server.fetch(request) }
}
