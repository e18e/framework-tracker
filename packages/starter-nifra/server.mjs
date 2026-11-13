import { serve } from '@nifrajs/node'
import handler from './.vercel/output/functions/index.func/index.js'

await serve(
  { fetch: handler },
  {
    hostname: process.env.HOST ?? '0.0.0.0',
    port: Number(process.env.PORT ?? 3000),
  },
)
