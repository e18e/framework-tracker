import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { packagesDir } from '../../constants.ts'
import type { ServerRenderHandler } from '../types.ts'

export async function buildNextJSHandler(): Promise<ServerRenderHandler> {
  const appDir = join(packagesDir, 'app-next-js')
  const nextEntryPath = join(
    appDir,
    'node_modules',
    'next',
    'dist',
    'server',
    'next.js',
  )
  const { default: next } = await import(pathToFileURL(nextEntryPath).href)

  const app = next({
    dev: false,
    hostname: 'localhost',
    port: 3000,
    dir: appDir,
  })
  await app.prepare()
  return {
    type: 'node',
    handler:
      app.getRequestHandler() as unknown as import('../types.ts').NodeServerRenderHandler,
  }
}
