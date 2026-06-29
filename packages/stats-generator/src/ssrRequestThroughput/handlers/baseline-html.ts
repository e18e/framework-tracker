import { testData } from '../../../../testdata/src/ssr.ts'
import { renderSSRThroughputHtml } from '../../baseline-html.ts'
import type { NodeServerRenderHandler, ServerRenderHandler } from '../types.ts'

export async function buildBaselineHtmlHandler(): Promise<ServerRenderHandler> {
  const handler: NodeServerRenderHandler = async (_req, res) => {
    const entries = await testData()
    const html = renderSSRThroughputHtml(entries)

    res.writeHead(200)
    res.end(html)
  }

  return { type: 'node', handler }
}
