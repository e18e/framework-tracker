import { createServer } from 'node:http'
import { testData } from '../../../testdata/src/ssr.ts'
import { getPort, registerShutdown } from './common.ts'

const PORT = getPort()

const server = createServer(async (_req, res) => {
  const entries = await testData()
  const rows = entries
    .map((entry) => `<tr><td>${entry.id}</td><td>${entry.name}</td></tr>`)
    .join('')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Baseline HTML</title></head><body><table><tbody>${rows}</tbody></table></body></html>`

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(html)
}).listen(PORT, () => {
  console.log(`Ready at http://localhost:${PORT}`)
})

registerShutdown(server)
