import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { packagesDir } from '../../constants.ts'
import type { ServerRenderHandler } from '../types.ts'

export async function buildHonoLitHandler(): Promise<ServerRenderHandler> {
  const entryPath = join(packagesDir, 'app-hono-lit', 'src', 'app.ts')
  const { app } = (await import(pathToFileURL(entryPath).href)) as {
    app: { fetch: (request: Request) => Response | Promise<Response> }
  }

  return { type: 'web', handler: async (request) => app.fetch(request) }
}
