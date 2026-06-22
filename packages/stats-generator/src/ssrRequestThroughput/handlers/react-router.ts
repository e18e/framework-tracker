import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { packagesDir } from '../../constants.ts'
import type { ServerRenderHandler } from '../types.ts'

export async function buildReactRouterHandler(): Promise<ServerRenderHandler> {
  const appDir = join(packagesDir, 'app-react-router')
  const buildPath = join(appDir, 'build', 'server', 'index.js')
  const buildUrl = pathToFileURL(buildPath).href

  const rrUrl = import.meta.resolve(
    'react-router',
    pathToFileURL(join(appDir, 'package.json')).href,
  )
  const { createRequestHandler } = await import(rrUrl)
  const build = await import(buildUrl)

  return {
    type: 'web',
    handler: createRequestHandler(build, 'production'),
  }
}
