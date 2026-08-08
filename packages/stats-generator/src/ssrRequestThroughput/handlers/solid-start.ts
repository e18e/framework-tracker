import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { packagesDir } from '../../constants.ts'
import { importWithoutListening } from './nitro.ts'
import type { ServerRenderHandler } from '../types.ts'

interface NitroGlobal {
  __nitro__?: Record<
    string,
    {
      fetch: (request: Request) => Promise<Response>
    }
  >
}

export async function buildSolidStartHandler(): Promise<ServerRenderHandler> {
  const entryPath = join(
    packagesDir,
    'app-solid-start',
    '.output',
    'server',
    'index.mjs',
  )
  const entryUrl = pathToFileURL(entryPath).href
  await importWithoutListening<Record<string, never>>(entryUrl)
  const nitroApp = (globalThis as typeof globalThis & NitroGlobal).__nitro__
    ?.default

  if (!nitroApp) {
    throw new Error('Unable to find SolidStart Nitro app')
  }

  return {
    type: 'web',
    handler: (request) => nitroApp.fetch(request),
  }
}
