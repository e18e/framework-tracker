import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { packagesDir } from '../../constants.ts'
import type { SSRHandler } from '../types.ts'

export async function buildSolidStartHandler(): Promise<SSRHandler> {
  const entryPath = join(
    packagesDir,
    'app-solid-start',
    '.output',
    'server',
    'index.mjs',
  )
  const entryUrl = pathToFileURL(entryPath).href
  const { handler } = await import(entryUrl)

  // h3's sendStream short-circuits when res.socket is falsy,
  // so we wrap the handler to set a truthy socket on the mock response
  return ((req, res) => {
    if (!res.socket) {
      res.socket = {} as any
    }
    return handler(req, res)
  }) as SSRHandler
}
