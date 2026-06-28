import { createServer } from 'node:http'
import { testData } from '../../../testdata/src/ssr.ts'
import { renderBaselineHtml } from '../baseline-html.ts'
import { getPort, registerShutdown } from './common.ts'

const PORT = getPort()

const server = createServer(async (_req, res) => {
  const entries = await testData()
  const html = renderBaselineHtml(entries)

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(html)
}).listen(PORT, () => {
  console.log(`Ready at http://localhost:${PORT}`)
})

registerShutdown(server)
