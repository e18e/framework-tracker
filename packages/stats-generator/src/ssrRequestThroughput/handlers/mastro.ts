import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { packagesDir } from '../../constants.ts'
import type { ServerRenderHandler } from '../types.ts'

export async function buildMastroHandler(): Promise<ServerRenderHandler> {
  const entryPath = join(packagesDir, 'app-mastro', 'server.ts')
  const entryUrl = pathToFileURL(entryPath).href
  const { handler } = await import(entryUrl)
  return {
    type: 'web',
    handler: (request) => {
      const url = new URL(request.url)
      url.hostname = '127.0.0.1'
      return handler(new Request(url, request))
    },
  }
}
