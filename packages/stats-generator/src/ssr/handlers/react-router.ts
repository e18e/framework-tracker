import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequestHandler } from 'react-router'
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
  return {
    type: 'web',
    handler: createRequestHandler(build, 'production'),
  }
}
