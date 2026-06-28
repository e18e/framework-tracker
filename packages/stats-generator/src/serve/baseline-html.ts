import { createServer } from 'node:http'
import { testData } from '../../../testdata/src/ssr.ts'
import { renderBaselineHtml } from '../baseline-html.ts'
import { getHost, getPort, registerShutdown } from './common.ts'

const HOST = getHost()
const PORT = getPort()

const server = createServer(async (_req, res) => {
  const entries = await testData()
  const html = renderBaselineHtml(entries)

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(html)
}).listen(PORT, HOST, () => {
  console.log(`Ready at http://${HOST}:${PORT}`)
})

registerShutdown(server)
