import { Server as HttpServer } from 'node:http'
import { Server as HttpsServer } from 'node:https'

export async function importWithoutListening<T>(entryUrl: string): Promise<T> {
  const { module } = await importWithCapturedServer<T>(entryUrl)
  return module
}

export async function importWithCapturedServer<T>(
  entryUrl: string,
): Promise<{ module: T; server: HttpServer | HttpsServer | undefined }> {
  const originalHttpListen = HttpServer.prototype.listen
  const originalHttpsListen = HttpsServer.prototype.listen
  let server: HttpServer | HttpsServer | undefined

  const listen: typeof HttpServer.prototype.listen = function (
    this: HttpServer | HttpsServer,
  ) {
    server = this
    // Do not invoke listen callbacks here; no socket is bound, so server.address() is null.
    return this
  } as typeof HttpServer.prototype.listen

  HttpServer.prototype.listen = listen
  HttpsServer.prototype.listen =
    listen as unknown as typeof HttpsServer.prototype.listen

  try {
    return { module: (await import(entryUrl)) as T, server }
  } finally {
    HttpServer.prototype.listen = originalHttpListen
    HttpsServer.prototype.listen = originalHttpsListen
  }
}
