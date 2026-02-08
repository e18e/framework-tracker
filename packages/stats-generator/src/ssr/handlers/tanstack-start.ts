import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { packagesDir } from '../../constants.ts'
import type { SSRHandler } from '../types.ts'

export async function buildTanStackStartHandler(): Promise<SSRHandler> {
  const entryPath = join(
    packagesDir,
    'app-tanstack-start-react',
    '.output',
    'server',
    'index.mjs',
  )
  const entryUrl = pathToFileURL(entryPath).href
  const { middleware } = await import(entryUrl)

  // srvx's toNodeHandler checks res.socket and short-circuits when falsy,
  // so we wrap the handler to set a truthy socket on the mock response
  return ((req, res) => {
    if (!res.socket) {
      res.socket = {} as any
    }
    return middleware(req, res)
  }) as SSRHandler
}
