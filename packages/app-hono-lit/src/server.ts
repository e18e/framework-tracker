import { serve } from '@hono/node-server'
import { app } from './app.ts'

const hostname = process.env.HOST ?? '127.0.0.1'
const port = Number.parseInt(process.env.PORT ?? '3000', 10)

const server = serve({ fetch: app.fetch, hostname, port }, () => {
  console.log(`Listening on http://${hostname}:${port}`)
})

const shutdown = () => {
  server.close(() => process.exit(0))
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
