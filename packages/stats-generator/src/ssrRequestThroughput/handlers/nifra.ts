import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { packagesDir } from '../../constants.ts'
import type { ServerRenderHandler, WebServerRenderHandler } from '../types.ts'

export async function buildNifraHandler(): Promise<ServerRenderHandler> {
  const entryPath = join(packagesDir, 'app-nifra', '.nifra-node', 'server.js')
  const entryUrl = pathToFileURL(entryPath).href
  const { app } = (await import(entryUrl)) as {
    app: { fetch: WebServerRenderHandler }
  }
  return { type: 'web', handler: app.fetch.bind(app) }
}
