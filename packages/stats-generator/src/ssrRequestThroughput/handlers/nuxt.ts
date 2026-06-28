import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { packagesDir } from '../../constants.ts'
import { importWithoutListening } from './nitro.ts'
import type { ServerRenderHandler } from '../types.ts'

export async function buildNuxtHandler(): Promise<ServerRenderHandler> {
  const entryPath = join(
    packagesDir,
    'app-nuxt',
    '.output',
    'server',
    'chunks',
    'nitro',
    'nitro.mjs',
  )
  const entryUrl = pathToFileURL(entryPath).href

  const mod = await importWithoutListening<{
    h: () => {
      localFetch: (input: string, init?: RequestInit) => Promise<Response>
    }
  }>(entryUrl)
  const nitroApp = mod.h()

  return {
    type: 'web',
    handler: (request) => {
      const url = new URL(request.url)
      return nitroApp.localFetch(`${url.pathname}${url.search}`, {
        headers: request.headers,
        method: request.method,
      })
    },
  }
}
