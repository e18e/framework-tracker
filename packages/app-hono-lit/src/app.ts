import { readFileSync } from 'node:fs'
import { render } from '@lit-labs/ssr'
import { collectResult } from '@lit-labs/ssr/lib/render-result.js'
import { Hono } from 'hono'
import { html, type TemplateResult } from 'lit'
import { testData } from '../../testdata/src/ssr.ts'
import { initialLoad, linkedTable, plainTable } from './templates.ts'

const initialLoadCss = readFileSync(
  new URL('../../testdata/src/initial-load.css', import.meta.url),
  'utf-8',
)

// Lit renders the page content. The document shell stays a plain string
// because Lit SSR cannot bind inside raw-text elements such as <title>.
async function page(
  title: string,
  body: TemplateResult,
  head = '',
): Promise<string> {
  const content = await collectResult(render(body))
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /><title>${title}</title>${head}</head><body>${content}</body></html>`
}

export const app = new Hono()
  .get('/', async (c) =>
    c.html(await page('Hono + Lit', linkedTable(await testData()))),
  )
  .get('/server-side-rendered', async (c) =>
    c.html(
      await page(
        'Hono + Lit Server Side Rendered',
        linkedTable(await testData()),
      ),
    ),
  )
  .get('/server-side-rendered/:id', async (c) =>
    c.html(
      await page(
        'Hono + Lit Server Side Rendered Detail',
        html`<p id="detail-id">${c.req.param('id')}</p>`,
      ),
    ),
  )
  .get('/ssr-throughput', async (c) =>
    c.html(
      await page('Hono + Lit SSR Throughput', plainTable(await testData())),
    ),
  )
  .get('/initial-load', async (c) =>
    c.html(
      await page(
        'Hono + Lit Initial Load',
        initialLoad,
        '<link rel="stylesheet" href="/initial-load.css" />',
      ),
    ),
  )
  .get('/initial-load.css', (c) =>
    c.body(initialLoadCss, 200, { 'content-type': 'text/css; charset=utf-8' }),
  )
