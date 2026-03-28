import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createServer } from 'node:http'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const PORT = parseInt(process.env.PORT ?? '3000', 10)

const nextEntryPath = join(
  __dirname,
  'node_modules',
  'next',
  'dist',
  'server',
  'next.js',
)
const { default: next } = await import(pathToFileURL(nextEntryPath).href)

const app = next({
  dev: false,
  hostname: 'localhost',
  port: PORT,
  dir: __dirname,
})
await app.prepare()
const handler = app.getRequestHandler()

createServer((req, res) => handler(req, res)).listen(PORT, () => {
  console.log(`Ready at http://localhost:${PORT}`)
})
