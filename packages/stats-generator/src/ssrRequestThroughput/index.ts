import { runBenchmark } from './run-benchmark.ts'
import { buildAstroHandler } from './handlers/astro.ts'
import { buildBaselineHtmlHandler } from './handlers/baseline-html.ts'
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
      displayName: 'Baseline HTML SSR Request Handler Throughput',
      package: 'app-baseline-html',
      buildHandler: buildBaselineHtmlHandler,
    },
    {
      name: 'astro-ssr-request-throughput',
      displayName: 'Astro SSR Request Handler Throughput',
      package: 'app-astro',
      buildHandler: buildAstroHandler,
    },
    {
      name: 'nuxt-ssr-request-throughput',
      displayName: 'Nuxt SSR Request Handler Throughput',
      package: 'app-nuxt',
      buildHandler: buildNuxtHandler,
    },
    {
      name: 'sveltekit-ssr-request-throughput',
      displayName: 'SvelteKit SSR Request Handler Throughput',
      package: 'app-sveltekit',
      buildHandler: buildSvelteKitHandler,
    },
    {
      name: 'next-ssr-request-throughput',
      displayName: 'Next.js SSR Request Handler Throughput',
      package: 'app-next-js',
      buildHandler: buildNextJSHandler,
    },
    {
      name: 'react-router-ssr-request-throughput',
      displayName: 'React Router SSR Request Handler Throughput',
      package: 'app-react-router',
      buildHandler: buildReactRouterHandler,
    },
    {
      name: 'solid-start-ssr-request-throughput',
      displayName: 'SolidStart SSR Request Handler Throughput',
      package: 'app-solid-start',
      buildHandler: buildSolidStartHandler,
    },
    {
      name: 'tanstack-start-ssr-request-throughput',
      displayName: 'TanStack Start SSR Request Handler Throughput',
      package: 'app-tanstack-start-react',
      buildHandler: buildTanStackStartHandler,
    },
  ]

export function supportsSSRRequestThroughputBenchmark(
  packageName: string,
): boolean {
  return SSR_REQUEST_THROUGHPUT_FRAMEWORKS.some(
    (framework) => framework.package === packageName,
  )
}

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

  const previousNodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'production'

  try {
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
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV
    } else {
      process.env.NODE_ENV = previousNodeEnv
    }
  }
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
