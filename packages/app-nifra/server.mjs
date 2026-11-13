import { serve, serveStatic } from '@nifrajs/node'
import { app } from './.nifra-node/server.js'

await serve(app, {
  hostname: process.env.HOST ?? '0.0.0.0',
  port: Number(process.env.PORT ?? 3000),
  static: serveStatic({
    dir: new URL('./.nifra-node/assets/', import.meta.url),
  }),
})
