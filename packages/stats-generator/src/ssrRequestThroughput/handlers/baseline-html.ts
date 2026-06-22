import { testData } from '../../../../testdata/src/ssr.ts'
import type { ServerRenderHandler } from '../types.ts'

export async function buildBaselineHtmlHandler(): Promise<ServerRenderHandler> {
  const handler: import('../types.ts').NodeServerRenderHandler = async (
    _req,
    res,
  ) => {
    const entries = await testData()

    const rows = entries
      .map((entry) => `<tr><td>${entry.id}</td><td>${entry.name}</td></tr>`)
      .join('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Baseline HTML</title></head><body><table><tbody>${rows}</tbody></table></body></html>`

    res.writeHead(200)
    res.end(html)
  }

  return { type: 'node', handler }
}
