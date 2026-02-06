import { join } from 'node:path'
import next from 'next'
import { packagesDir } from '../../constants.ts'
import type { SSRHandler } from '../types.ts'

export async function buildNextJSHandler(): Promise<SSRHandler> {
  const app = next({
    dev: false,
    hostname: 'localhost',
    port: 3000,
    dir: join(packagesDir, 'app-next-js'),
  })
  await app.prepare()
  // TODO: Make the SSRHandler type more flexible so we don't have to cast here
  return app.getRequestHandler() as unknown as SSRHandler
}
