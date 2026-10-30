import { servingFrameworks } from '../serving-frameworks.ts'
import { startBenchmarkServer } from '../benchmark-server.ts'
import { getHost } from '../serve/common.ts'
import { runBenchmark } from './run-benchmark.ts'
import type { InitialLoadResult } from '@framework-tracker/results'

const INITIAL_LOAD_HOST = getHost()
const INITIAL_LOAD_PORT = 3003

export async function runInitialLoadBenchmark(
  packageName: string,
): Promise<InitialLoadResult> {
  const config = servingFrameworks.find((f) => f.package === packageName)

  if (!config) {
    throw new Error(
      `Unknown initial load package: ${packageName}. Available: ${servingFrameworks.map((f) => f.package).join(', ')}`,
    )
  }

  console.info(`Starting server for ${config.displayName}...`)
  const killServer = await startBenchmarkServer(config, {
    host: INITIAL_LOAD_HOST,
    port: INITIAL_LOAD_PORT,
    readinessPath: '/initial-load',
  })

  try {
    console.info(`Running initial load benchmark for ${config.displayName}...`)
    return await runBenchmark(
      `http://${INITIAL_LOAD_HOST}:${INITIAL_LOAD_PORT}`,
    )
  } finally {
    killServer()
  }
}
