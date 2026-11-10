import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import sirv from 'sirv'
import { assembleHTML, createEmberApp } from 'vite-ember-ssr/server'

/**
 * Renders every page on the server, with vite-ember-ssr.
 *
 * - `node server.js --dev` renders through Vite, with HMR
 * - `node server.js` serves the output of the build
 *
 * The browser rehydrates the rendered DOM.
 * fetch() responses from the render are in the page (the "shoebox"),
 * so the browser does not request them again.
 */
const isDev = process.argv.includes('--dev')
const port = Number(process.env.PORT ?? 4200)
const host = process.env.HOST

const { handle, template, emberApp } = isDev ? await dev() : await production()

/**
 * Exported for the request throughput benchmark,
 * which calls the handler without a server.
 */
export function handler(request, response) {
  let { pathname } = new URL(request.url, 'http://localhost')

  /**
   * A path with an extension is a file.
   * sirv (or Vite, in dev) serves it, and a missing file is a 404.
   *
   * Every other path is a page.
   * In dev, Vite also serves its own modules (`/@vite/client`),
   * and with `appType: "custom"` it leaves pages to us.
   * In production, sirv would answer `/` with the index.html that has no render in it.
   */
  if (extname(pathname)) {
    handle(request, response, () => notFound(response))
  } else if (isDev) {
    handle(request, response, () => render(request, response))
  } else {
    render(request, response)
  }
}

if (import.meta.main) {
  createServer(handler).listen(port, host, () => {
    console.log(`Listening on http://${host ?? 'localhost'}:${port}`)
  })
}

function notFound(response) {
  response.writeHead(404, { 'content-type': 'text/plain' })
  response.end('Not Found')
}

async function render(request, response) {
  try {
    let rendered = await emberApp.renderRoute(request.url, { shoebox: true })
    let html = assembleHTML(await template(request.url), rendered)

    if (rendered.error) console.error(rendered.error)

    response.writeHead(rendered.statusCode, { 'content-type': 'text/html' })
    response.end(html)
  } catch (error) {
    console.error(error)
    response.writeHead(500, { 'content-type': 'text/plain' })
    response.end(String(error))
  }
}

async function production() {
  let dist = join(import.meta.dirname, 'dist')
  let html = await readFile(join(dist, 'client/index.html'), 'utf8')

  return {
    handle: sirv(join(dist, 'client')),
    template: async () => html,
    emberApp: await createEmberApp(join(dist, 'server/app-ssr.js')),
  }
}

async function dev() {
  let { createServer: createVite } = await import('vite')
  let vite = await createVite({
    server: { middlewareMode: true },
    appType: 'custom',
  })

  return {
    handle: vite.middlewares,
    template: async (url) =>
      vite.transformIndexHtml(url, await readFile('index.html', 'utf8')),
    emberApp: await createEmberApp('/app/app-ssr', {
      dev: { ssrLoadModule: vite.ssrLoadModule.bind(vite) },
    }),
  }
}
