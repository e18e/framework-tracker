import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { packagesDir } from '../constants.ts'
import { getHost, getPort } from '../serve/common.ts'
import { runLoadTest } from './run-load-test.ts'
import type { SSRLoadBenchmarkResult } from './types.ts'

export const DEFAULT_SSR_LOAD_PORT = 3003
export const SSR_LOAD_PATH = '/server-side-rendered'

interface SSRLoadFrameworkConfig {
  name: string
  displayName: string
  package: string
  serveScript: string
}

const SSR_LOAD_FRAMEWORKS: SSRLoadFrameworkConfig[] = [
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
    name: 'mastro-ssr-load',
    displayName: 'Mastro SSR Load',
    package: 'app-mastro',
    serveScript: 'mastro.ts',
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
  const appDir = join(packagesDir, config.package)
  const scriptPath = fileURLToPath(
    new URL(`../serve/${config.serveScript}`, import.meta.url),
  )

  const proc = spawn('node', [scriptPath, appDir], {
    env: {
      ...process.env,
      HOST: host,
      NODE_ENV: 'production',
      PORT: String(port),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  proc.stdout?.on('data', (chunk: Buffer) =>
    process.stdout.write(`[${config.package}] ${chunk}`),
  )
  proc.stderr?.on('data', (chunk: Buffer) =>
    process.stderr.write(`[${config.package}] ${chunk}`),
  )

  let exited = false
  proc.on('exit', (code) => {
    exited = true
    if (code != null && code !== 0) {
      console.error(`[${config.package}] server exited with code ${code}`)
    }
  })

  const exitPromise = new Promise<never>((_, reject) => {
    proc.on('exit', (code) => {
      if (code != null && code !== 0) {
        reject(new Error(`Server process exited with code ${code}`))
      }
    })
  })

  await Promise.race([
    waitForServer(`http://${host}:${port}${SSR_LOAD_PATH}`),
    exitPromise,
  ])

  return () => {
    if (!exited) proc.kill('SIGTERM')
  }
}

export async function runSSRLoadBenchmark(
  packageName: string,
): Promise<SSRLoadBenchmarkResult> {
  const config = requireFrameworkConfig(packageName)

  const remoteUrl = process.env.SSR_LOAD_TARGET_URL
  if (remoteUrl) {
    const url = new URL(remoteUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('SSR_LOAD_TARGET_URL must use http or https')
    }

    console.info(`Using remote server for ${config.displayName}: ${url}`)
    await waitForServer(url.toString())
    return {
      name: config.name,
      displayName: config.displayName,
      package: config.package,
      ssrLoadTests: await runLoadTest(url.toString()),
    }
  }

  const host = getHost()
  const port = getPort(DEFAULT_SSR_LOAD_PORT)
  const url = `http://${host}:${port}${SSR_LOAD_PATH}`
  console.info(`Starting server for ${config.displayName}...`)
  const killServer = await startSSRLoadServer(packageName)

  try {
    console.info(`Running SSR load benchmark for ${config.displayName}...`)
    return {
      name: config.name,
      displayName: config.displayName,
      package: config.package,
      ssrLoadTests: await runLoadTest(url),
    }
  } finally {
    killServer()
  }
}
