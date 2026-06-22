import { runBenchmark } from './run-benchmark.ts'
import { buildAstroHandler } from './handlers/astro.ts'
import { buildBaselineHtmlHandler } from './handlers/baseline-html.ts'
import { buildMastroHandler } from './handlers/mastro.ts'
import { buildNuxtHandler } from './handlers/nuxt.ts'
import { buildSvelteKitHandler } from './handlers/sveltekit.ts'
import { buildNextJSHandler } from './handlers/nextjs.ts'
import { buildReactRouterHandler } from './handlers/react-router.ts'
import { buildSolidStartHandler } from './handlers/solid-start.ts'
import { buildTanStackStartHandler } from './handlers/tanstack-start.ts'
import type {
  ServerRenderHandler,
  SSRRequestThroughputBenchmarkResult,
  SSRRequestThroughputStats,
} from './types.ts'

interface SSRRequestThroughputFrameworkConfig {
  name: string
  displayName: string
  package: string
  buildHandler: () => Promise<ServerRenderHandler>
}

const SSR_REQUEST_THROUGHPUT_FRAMEWORKS: SSRRequestThroughputFrameworkConfig[] =
  [
    {
      name: 'baseline-html',
      displayName: 'Baseline HTML',
      package: 'app-baseline-html',
      buildHandler: buildBaselineHtmlHandler,
    },
    {
      name: 'astro-ssr-request-throughput',
      displayName: 'Astro SSR Request Throughput',
      package: 'app-astro',
      buildHandler: buildAstroHandler,
    },
    {
      name: 'mastro-ssr-request-throughput',
      displayName: 'Mastro SSR Request Throughput',
      package: 'app-mastro',
      buildHandler: buildMastroHandler,
    },
    {
      name: 'nuxt-ssr-request-throughput',
      displayName: 'Nuxt SSR Request Throughput',
      package: 'app-nuxt',
      buildHandler: buildNuxtHandler,
    },
    {
      name: 'sveltekit-ssr-request-throughput',
      displayName: 'SvelteKit SSR Request Throughput',
      package: 'app-sveltekit',
      buildHandler: buildSvelteKitHandler,
    },
    {
      name: 'next-ssr-request-throughput',
      displayName: 'Next.js SSR Request Throughput',
      package: 'app-next-js',
      buildHandler: buildNextJSHandler,
    },
    {
      name: 'react-router-ssr-request-throughput',
      displayName: 'React Router SSR Request Throughput',
      package: 'app-react-router',
      buildHandler: buildReactRouterHandler,
    },
    {
      name: 'solid-start-ssr-request-throughput',
      displayName: 'SolidStart SSR Request Throughput',
      package: 'app-solid-start',
      buildHandler: buildSolidStartHandler,
    },
    {
      name: 'tanstack-start-ssr-request-throughput',
      displayName: 'TanStack Start SSR Request Throughput',
      package: 'app-tanstack-start-react',
      buildHandler: buildTanStackStartHandler,
    },
  ]

export async function runSSRRequestThroughputBenchmark(
  packageName: string,
): Promise<SSRRequestThroughputBenchmarkResult> {
  const config = SSR_REQUEST_THROUGHPUT_FRAMEWORKS.find(
    (f) => f.package === packageName,
  )

  if (!config) {
    throw new Error(
      `Unknown SSR request throughput package: ${packageName}. Available: ${SSR_REQUEST_THROUGHPUT_FRAMEWORKS.map((f) => f.package).join(', ')}`,
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

export function toSSRRequestThroughputStats(
  result: SSRRequestThroughputBenchmarkResult,
): SSRRequestThroughputStats {
  return {
    name: result.displayName,
    package: result.package,
    type: 'runtime-app',
    ssrRequestThroughputTests: {
      opsPerSec: result.opsPerSec,
      avgLatencyMs: result.avgLatencyMs,
      medianLatencyMs: result.medianLatencyMs,
      samples: result.samples,
      bodySizeKb: result.bodySizeKb,
      duplicationFactor: result.duplicationFactor,
    },
  }
}
