import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { packagesDir } from '../../constants.ts'
import type { ServerRenderHandler } from '../types.ts'

export async function buildAstroHandler(): Promise<ServerRenderHandler> {
  const entryPath = join(
    packagesDir,
    'app-astro',
    'dist',
    'server',
    'entry.mjs',
  )
  const entryUrl = pathToFileURL(entryPath).href

  const previousAutostart = process.env.ASTRO_NODE_AUTOSTART
  process.env.ASTRO_NODE_AUTOSTART = 'disabled'

  try {
    const { handler } = await import(entryUrl)
    return { type: 'node', handler }
  } finally {
    if (previousAutostart === undefined) {
      delete process.env.ASTRO_NODE_AUTOSTART
    } else {
      process.env.ASTRO_NODE_AUTOSTART = previousAutostart
    }
  }
}
