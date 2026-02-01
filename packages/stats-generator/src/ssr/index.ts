import { runBenchmark } from './run-benchmark.ts'
import { buildAstroHandler } from './handlers/astro.ts'
import { buildNuxtHandler } from './handlers/nuxt.ts'
import type { SSRBenchmarkResult, SSRStats } from './types.ts'

export type { SSRBenchmarkResult, SSRStats } from './types.ts'

interface SSRFrameworkConfig {
  name: string
  displayName: string
  package: string
  buildHandler: () => Promise<
    (
      req: import('./mock-http.ts').IncomingMessage,
      res: import('./mock-http.ts').ServerResponse,
    ) => void | Promise<void>
  >
}

const SSR_FRAMEWORKS: SSRFrameworkConfig[] = [
  {
    name: 'astro-ssr',
    displayName: 'Astro SSR',
    package: 'app-astro',
    buildHandler: buildAstroHandler,
  },
  {
    name: 'nuxt-ssr',
    displayName: 'Nuxt SSR',
    package: 'app-nuxt',
    buildHandler: buildNuxtHandler,
  },
]

export async function runAllSSRBenchmarks(): Promise<SSRBenchmarkResult[]> {
  const handlers = await Promise.all(
    SSR_FRAMEWORKS.map(async (config) => ({
      name: config.name,
      displayName: config.displayName,
      package: config.package,
      handler: await config.buildHandler(),
    })),
  )

  return runBenchmark(handlers)
}

export function toSSRStats(result: SSRBenchmarkResult): SSRStats {
  return {
    name: result.displayName,
    package: result.package,
    type: 'ssr-app',
    ssrOpsPerSec: result.opsPerSec,
    ssrAvgLatencyMs: result.avgLatencyMs,
    ssrSamples: result.samples,
    ssrBodySizeKb: result.bodySizeKb,
    ssrDuplicationFactor: result.duplicationFactor,
  }
}
