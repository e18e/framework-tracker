import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { packagesDir } from '../../constants.ts'
import type { ServerRenderHandler, WebServerRenderHandler } from '../types.ts'

export async function buildNifraHandler(): Promise<ServerRenderHandler> {
  const entryPath = join(
    packagesDir,
    'app-nifra',
    '.vercel',
    'output',
    'functions',
    'index.func',
    'index.js',
  )
  const entryUrl = pathToFileURL(entryPath).href
  const { default: handler } = (await import(entryUrl)) as {
    default: WebServerRenderHandler
  }
  return { type: 'web', handler }
}
