import * as http from 'node:http'
import { createRequestListener } from '@remix-run/node-fetch-server'
import { Mastro } from '@mastrojs/mastro/server-programmatic'
import { GET as getDetail } from './handlers/detail.ts'
import { GET as getHome } from './handlers/home.ts'

// This is using Mastro's programmatic (Express-like) router
// because the default file-based router requires the
// current working directory to be the project root, which isn't
// always the case in this pnpm monorepo.

export const handler = new Mastro<unknown, void>()
  .get('/', getHome)
  .get('/ssr-throughput', getHome)
  .get('/server-side-rendered', getHome)
  .get('/server-side-rendered/:id', getDetail)
  .createHandler()

const host = process.env.HOST ?? '127.0.0.1'
const port = Number.parseInt(process.env.PORT ?? '8000', 10)

if (import.meta.main) {
  const server = http.createServer(createRequestListener(handler))

  server.on('error', (e) => {
    console.error(e)
  })

  server.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}`)
  })
}
