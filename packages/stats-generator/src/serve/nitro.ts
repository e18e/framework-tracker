import { createServer, Server as HttpServer } from 'node:http'
import { Server as HttpsServer } from 'node:https'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  getPort,
  parseAppDir,
  registerShutdown,
  tryServeFile,
} from './common.ts'

async function importWithCapturedServer(
  entryUrl: string,
): Promise<HttpServer | HttpsServer | undefined> {
  const originalHttpListen = HttpServer.prototype.listen
  const originalHttpsListen = HttpsServer.prototype.listen
  let server: HttpServer | HttpsServer | undefined

  const listen: typeof HttpServer.prototype.listen = function (
    this: HttpServer,
  ) {
    server = this
    return this
  } as typeof HttpServer.prototype.listen

  HttpServer.prototype.listen = listen
  HttpsServer.prototype.listen =
    listen as unknown as typeof HttpsServer.prototype.listen

  try {
    await import(entryUrl)
    return server
  } finally {
    HttpServer.prototype.listen = originalHttpListen
    HttpsServer.prototype.listen = originalHttpsListen
  }
}

const appDir = parseAppDir()
const PORT = getPort()
const publicDir = join(appDir, '.output', 'public')
const entryUrl = pathToFileURL(
  join(appDir, '.output', 'server', 'index.mjs'),
).href

const capturedServer = await importWithCapturedServer(entryUrl)
const listener = capturedServer?.listeners('request')[0]

if (typeof listener !== 'function') {
  throw new Error('Unable to find Nitro request listener')
}

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', `http://localhost:${PORT}`)

  if (tryServeFile(publicDir, pathname, req, res)) return

  listener(req, res)
}).listen(PORT, () => {
  console.log(`Ready at http://localhost:${PORT}`)
})

registerShutdown(server)
