import { Server } from 'node:http'
import { pathToFileURL } from 'node:url'
import { toNodeListener, toWebHandler } from 'h3'
import { useNitroApp } from 'nitropack/runtime'

const nitroApp = useNitroApp()

/**
 * Web fetch handler so benchmarks can make requests without binding a socket.
 */
export default {
  fetch: toWebHandler(nitroApp.h3App),
}

const isEntrypoint =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href

if (isEntrypoint) {
  const port = Number(process.env.NITRO_PORT || process.env.PORT || 3000)
  const host = process.env.NITRO_HOST || process.env.HOST

  new Server(toNodeListener(nitroApp.h3App)).listen({ host, port }, () => {
    console.log(`Listening on http://${host ?? 'localhost'}:${port}`)
  })
}
