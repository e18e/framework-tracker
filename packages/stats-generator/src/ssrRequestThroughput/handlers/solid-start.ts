import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { packagesDir } from '../../constants.ts'
import { importWithCapturedServer } from './nitro.ts'
import type { NodeServerRenderHandler } from '../types.ts'
import type { ServerRenderHandler } from '../types.ts'

export async function buildSolidStartHandler(): Promise<ServerRenderHandler> {
  const entryPath = join(
    packagesDir,
    'app-solid-start',
    '.output',
    'server',
    'chunks',
    'nitro',
    'nitro.mjs',
  )
  const entryUrl = pathToFileURL(entryPath).href
  const { server } = await importWithCapturedServer<Record<string, never>>(
    entryUrl,
  )
  const handler = server?.listeners('request')[0]

  if (typeof handler !== 'function') {
    throw new Error('Unable to find SolidStart request handler')
  }

  return {
    type: 'node',
    handler: (req, res) => {
      if (!res.socket) {
        res.socket = {}
      }
      return (handler as NodeServerRenderHandler)(req, res)
    },
  }
}
