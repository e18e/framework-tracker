import { testData } from '../../../../testdata/src/ssr.ts'
import { renderBaselineHtml } from '../../baseline-html.ts'
import type { NodeServerRenderHandler, ServerRenderHandler } from '../types.ts'

export async function buildBaselineHtmlHandler(): Promise<ServerRenderHandler> {
  const handler: NodeServerRenderHandler = async (_req, res) => {
    const entries = await testData()
    const html = renderBaselineHtml(entries)

    res.writeHead(200)
    res.end(html)
  }

  return { type: 'node', handler }
}
