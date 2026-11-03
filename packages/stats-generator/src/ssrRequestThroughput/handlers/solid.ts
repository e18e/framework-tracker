import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { packagesDir } from '../../constants.ts'
import type { ServerRenderHandler } from '../types.ts'

export async function buildSolidHandler(): Promise<ServerRenderHandler> {
  const entryPath = join(
    packagesDir,
    'app-solid',
    'dist',
    'server',
    'server.js',
  )
  const { handleRequest } = (await import(pathToFileURL(entryPath).href)) as {
    handleRequest: (request: Request) => Promise<Response>
  }

  return {
    type: 'web',
    handler: (request) => handleRequest(request),
  }
}
