import { servingFrameworks } from '../serving-frameworks.ts'
import { startBenchmarkServer } from '../benchmark-server.ts'
import { getHost } from '../serve/common.ts'
import { runBenchmark } from './run-benchmark.ts'
import type { ServerSideRenderedBenchmarkResult } from './types.ts'

const SERVER_SIDE_RENDERED_HOST = getHost()
const SERVER_SIDE_RENDERED_PORT = 3002

export async function runServerSideRenderedBenchmark(
  packageName: string,
  runs = 5,
): Promise<ServerSideRenderedBenchmarkResult> {
  const config = servingFrameworks.find((f) => f.package === packageName)

  if (!config) {
    throw new Error(
      `Unknown server side rendered package: ${packageName}. Available: ${servingFrameworks.map((f) => f.package).join(', ')}`,
    )
  }

  console.info(`Starting server for ${config.displayName}...`)
  const killServer = await startBenchmarkServer(config, {
    host: SERVER_SIDE_RENDERED_HOST,
    port: SERVER_SIDE_RENDERED_PORT,
    readinessPath: '/server-side-rendered',
  })

  try {
    console.info(
      `Running server side rendered benchmark for ${config.displayName}...`,
    )
    return await runBenchmark(
      `http://${SERVER_SIDE_RENDERED_HOST}:${SERVER_SIDE_RENDERED_PORT}`,
      `${config.package === 'app-next-js' ? 'next' : config.package === 'app-tanstack-start-react' ? 'tanstack-start' : config.package.slice(4)}-server-side-rendered`,
      config.displayName,
      runs,
      config.fullDocumentNavigation,
    )
  } finally {
    killServer()
  }
}
