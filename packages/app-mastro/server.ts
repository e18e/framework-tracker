import * as http from 'node:http'
import { createRequestListener } from '@remix-run/node-fetch-server'
import { Mastro } from '@mastrojs/mastro/server'
import { GET as getHome } from './handlers/home.ts'

// This is using Mastro's programmatic (Express-like) router
// because the default file-based router requires the
// current working directory to be the project root, which isn't
// always the case in this pnpm monorepo.

export const handler = new Mastro<unknown, void>()
  .get('/', getHome)
  .createHandler()

const port = 8000

if (import.meta.main) {
  const server = http.createServer(createRequestListener(handler))

  server.on('error', (e) => {
    console.error(e)
  })

  server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
  })
}
