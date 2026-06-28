import {
  createServer,
  Server as HttpServer,
  type IncomingMessage,
} from 'node:http'
import { Server as HttpsServer } from 'node:https'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { getPort, parseAppDir, registerShutdown } from './common.ts'

interface NitroGlobal {
  __nitro__?: Record<
    string,
    {
      fetch: (request: Request) => Promise<Response>
    }
  >
}

async function importWithoutListening(entryUrl: string): Promise<void> {
  const originalHttpListen = HttpServer.prototype.listen
  const originalHttpsListen = HttpsServer.prototype.listen

  const listen: typeof HttpServer.prototype.listen = function (
    this: HttpServer,
  ) {
    return this
  } as typeof HttpServer.prototype.listen

  HttpServer.prototype.listen = listen
  HttpsServer.prototype.listen =
    listen as unknown as typeof HttpsServer.prototype.listen

  try {
    await import(entryUrl)
  } finally {
    HttpServer.prototype.listen = originalHttpListen
    HttpsServer.prototype.listen = originalHttpsListen
  }
}

function getRequestHeaders(req: IncomingMessage): Headers {
  const headers = new Headers()

  for (const [name, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item)
    } else if (value !== undefined) {
      headers.set(name, value)
    }
  }

  return headers
}

const appDir = parseAppDir()
const PORT = getPort()
const entryUrl = pathToFileURL(
  join(appDir, '.output', 'server', 'index.mjs'),
).href

await importWithoutListening(entryUrl)
const nitroApp = (globalThis as typeof globalThis & NitroGlobal).__nitro__
  ?.default

if (!nitroApp) {
  throw new Error('Unable to find TanStack Start Nitro app')
}

const server = createServer(async (req, res) => {
  try {
    const request = new Request(
      new URL(req.url ?? '/', `http://localhost:${PORT}`),
      {
        headers: getRequestHeaders(req),
        method: req.method,
      },
    )
    const response = await nitroApp.fetch(request)

    res.statusCode = response.status
    res.statusMessage = response.statusText
    response.headers.forEach((value, name) => res.setHeader(name, value))

    if (req.method === 'HEAD' || !response.body) {
      res.end()
      return
    }

    res.end(Buffer.from(await response.arrayBuffer()))
  } catch (error) {
    console.error(error)
    if (!res.headersSent) {
      res.writeHead(500)
    }
    res.end('Internal Server Error')
  }
}).listen(PORT, () => {
  console.log(`Ready at http://localhost:${PORT}`)
})

registerShutdown(server)
