import {
  DEFAULT_SSR_LOAD_PORT,
  SSR_LOAD_PATH,
  startSSRLoadServer,
} from './ssrLoad/index.ts'
import { getHost, getPort } from './serve/common.ts'
import { parseArgs } from './utils.ts'

async function main() {
  const { packageName } = parseArgs(
    'Usage: run-ssr-load-server <package-name>\nExample: run-ssr-load-server app-astro',
  )

  const host = getHost('0.0.0.0')
  process.env.HOST = host
  const port = getPort(DEFAULT_SSR_LOAD_PORT)
  process.env.PORT = String(port)

  console.info(`Starting SSR load server for ${packageName}...`)
  const stopServer = await startSSRLoadServer(packageName)
  console.info(
    `SSR load server is ready on http://${host}:${port}${SSR_LOAD_PATH}`,
  )

  await new Promise<void>((resolve) => {
    const shutdown = () => {
      stopServer()
      resolve()
    }
    process.once('SIGINT', shutdown)
    process.once('SIGTERM', shutdown)
  })
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
