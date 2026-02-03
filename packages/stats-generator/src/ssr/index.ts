import { runBenchmark } from './run-benchmark.ts'
import { buildAstroHandler } from './handlers/astro.ts'
import { buildNuxtHandler } from './handlers/nuxt.ts'
import { buildSvelteKitHandler } from './handlers/sveltekit.ts'
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
  {
    name: 'sveltekit-ssr',
    displayName: 'SvelteKit SSR',
    package: 'app-sveltekit',
    buildHandler: buildSvelteKitHandler,
  },
]

export async function runSSRBenchmark(
  packageName: string,
): Promise<SSRBenchmarkResult> {
  const config = SSR_FRAMEWORKS.find((f) => f.package === packageName)

  if (!config) {
    throw new Error(
      `Unknown SSR package: ${packageName}. Available: ${SSR_FRAMEWORKS.map((f) => f.package).join(', ')}`,
    )
  }

  const handler = await config.buildHandler()
  const results = await runBenchmark([
    {
      name: config.name,
      displayName: config.displayName,
      package: config.package,
      handler,
    },
  ])

  return results[0]
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
