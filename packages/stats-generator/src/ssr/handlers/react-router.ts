import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequestListener } from '@react-router/node'
import { packagesDir } from '../../constants.ts'
import type { SSRHandler } from '../types.ts'

export async function buildReactRouterHandler(): Promise<SSRHandler> {
  const buildPath = join(
    packagesDir,
    'app-react-router',
    'build',
    'server',
    'index.js',
  )
  const buildUrl = pathToFileURL(buildPath).href
  const build = await import(buildUrl)
  // TODO: Make the SSRHandler type more flexible so we don't have to cast here
  return createRequestListener({
    build,
    mode: 'production',
  }) as unknown as SSRHandler
}
