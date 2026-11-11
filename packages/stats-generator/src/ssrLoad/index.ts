import { startBenchmarkServer } from '../benchmark-server.ts'
import type { BenchmarkServerConfig } from '../serving-frameworks.ts'
import { getHost, getPort } from '../serve/common.ts'
import { runLoadTest } from './run-load-test.ts'
import type { SSRLoadBenchmarkResult } from './types.ts'

import { getSSRLoadKind, getSSRLoadPath } from './config.ts'
import { verifySSRLoadTable } from './verify-table.ts'

export const DEFAULT_SSR_LOAD_PORT = 3003

type SSRLoadFrameworkConfig = BenchmarkServerConfig & {
  name: string
  displayName: string
}

const SSR_LOAD_FRAMEWORKS: SSRLoadFrameworkConfig[] = [
  {
    name: 'webui-ssr-load',
    displayName: 'WebUI SSR Load',
    package: 'app-webui',
    serveBinary: 'app-webui',
  },
  {
    name: 'baseline-html-ssr-load',
    displayName: 'Baseline HTML SSR Load',
    package: 'app-baseline-html',
    serveScript: 'baseline-html.ts',
  },
  {
    name: 'astro-ssr-load',
    displayName: 'Astro SSR Load',
    package: 'app-astro',
    serveScript: 'astro.ts',
  },
  {
    name: 'next-ssr-load',
    displayName: 'Next.js SSR Load',
    package: 'app-next-js',
    serveScript: 'next.ts',
  },
  {
    name: 'nuxt-ssr-load',
    displayName: 'Nuxt SSR Load',
    package: 'app-nuxt',
    serveScript: 'nitro.ts',
  },
  {
    name: 'pracht-ssr-load',
    displayName: 'Pracht SSR Load',
    package: 'app-pracht',
    serveScript: 'pracht.ts',
  },
  {
    name: 'react-router-ssr-load',
    displayName: 'React Router SSR Load',
    package: 'app-react-router',
    serveScript: 'react-router.ts',
  },
  {
    name: 'solid-start-ssr-load',
    displayName: 'SolidStart SSR Load',
    package: 'app-solid-start',
    serveScript: 'nitro.ts',
  },
  {
    name: 'solid-ssr-load',
    displayName: 'Solid 2.0 SSR Load',
    package: 'app-solid',
    serveScript: 'solid.ts',
  },
  {
    name: 'sveltekit-ssr-load',
    displayName: 'SvelteKit SSR Load',
    package: 'app-sveltekit',
    serveScript: 'sveltekit.ts',
  },
  {
    name: 'tanstack-start-ssr-load',
    displayName: 'TanStack Start SSR Load',
    package: 'app-tanstack-start-react',
    serveScript: 'tanstack-start.ts',
  },
]

export function supportsSSRLoadBenchmark(packageName: string): boolean {
  return getFrameworkConfig(packageName) !== undefined
}

function getFrameworkConfig(
  packageName: string,
): SSRLoadFrameworkConfig | undefined {
  return SSR_LOAD_FRAMEWORKS.find(
    (framework) => framework.package === packageName,
  )
}

function requireFrameworkConfig(packageName: string): SSRLoadFrameworkConfig {
  const config = getFrameworkConfig(packageName)

  if (!config) {
    throw new Error(
      `Unknown SSR load package: ${packageName}. Available: ${SSR_LOAD_FRAMEWORKS.map((framework) => framework.package).join(', ')}`,
    )
  }

  return config
}

async function waitForServer(url: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'text/html,application/xhtml+xml' },
      })
      const body = await res.text()
      if (res.status === 200 && body.includes('<table')) return
    } catch {
      // not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`)
}

export async function startSSRLoadServer(
  packageName: string,
): Promise<() => void> {
  return spawnServer(requireFrameworkConfig(packageName))
}

async function spawnServer(
  config: SSRLoadFrameworkConfig,
): Promise<() => void> {
  const host = getHost()
  const port = getPort(DEFAULT_SSR_LOAD_PORT)
  return startBenchmarkServer(config, {
    host,
    port,
    readinessPath: getSSRLoadPath(config.package, getSSRLoadKind()),
  })
}

export async function runSSRLoadBenchmark(
  packageName: string,
): Promise<SSRLoadBenchmarkResult> {
  const config = requireFrameworkConfig(packageName)

  const measuredPath = getSSRLoadPath(packageName, getSSRLoadKind())
  const remoteUrl = process.env.SSR_LOAD_TARGET_URL
  if (remoteUrl) {
    const url = new URL(remoteUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('SSR_LOAD_TARGET_URL must use http or https')
    }

    url.pathname = measuredPath
    console.info(`Using remote server for ${config.displayName}: ${url}`)
    await waitForServer(url.toString())
    verifySSRLoadTable(await (await fetch(url)).text())
    return {
      name: config.name,
      displayName: config.displayName,
      package: config.package,
      tests: await runLoadTest(url.toString()),
    }
  }

  const host = getHost()
  const port = getPort(DEFAULT_SSR_LOAD_PORT)
  const url = `http://${host}:${port}${measuredPath}`
  console.info(`Starting server for ${config.displayName}...`)
  const killServer = await startSSRLoadServer(packageName)

  try {
    verifySSRLoadTable(await (await fetch(url)).text())
    console.info(`Running SSR load benchmark for ${config.displayName}...`)
    return {
      name: config.name,
      displayName: config.displayName,
      package: config.package,
      tests: await runLoadTest(url),
    }
  } finally {
    killServer()
  }
}
