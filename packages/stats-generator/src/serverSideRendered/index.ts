import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { packagesDir } from '../constants.ts'
import { runBenchmark } from './run-benchmark.ts'
import type { ServerSideRenderedBenchmarkResult } from './types.ts'

const SERVER_SIDE_RENDERED_PORT = 3002

interface ServerSideRenderedFrameworkConfig {
  name: string
  displayName: string
  package: string
  serveScript: string
  serveArgs?: string[]
}

const SERVER_SIDE_RENDERED_FRAMEWORKS: ServerSideRenderedFrameworkConfig[] = [
  {
    name: 'astro-server-side-rendered',
    displayName: 'Astro Server Side Rendered',
    package: 'app-astro',
    serveScript: 'astro.ts',
  },
  {
    name: 'next-server-side-rendered',
    displayName: 'Next.js Server Side Rendered',
    package: 'app-next-js',
    serveScript: 'next.ts',
  },
  {
    name: 'nuxt-server-side-rendered',
    displayName: 'Nuxt Server Side Rendered',
    package: 'app-nuxt',
    serveScript: 'nitro.ts',
  },
  {
    name: 'react-router-server-side-rendered',
    displayName: 'React Router Server Side Rendered',
    package: 'app-react-router',
    serveScript: 'react-router.ts',
  },
  {
    name: 'solid-start-server-side-rendered',
    displayName: 'SolidStart Server Side Rendered',
    package: 'app-solid-start',
    serveScript: 'nitro.ts',
  },
  {
    name: 'sveltekit-server-side-rendered',
    displayName: 'SvelteKit Server Side Rendered',
    package: 'app-sveltekit',
    serveScript: 'sveltekit.ts',
  },
  {
    name: 'tanstack-start-server-side-rendered',
    displayName: 'TanStack Start Server Side Rendered',
    package: 'app-tanstack-start-react',
    serveScript: 'tanstack-start.ts',
    serveArgs: ['server-side-rendered'],
  },
]

async function waitForServer(url: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.status === 200) return
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`)
}

async function spawnServer(
  config: ServerSideRenderedFrameworkConfig,
): Promise<() => void> {
  const appDir = join(packagesDir, config.package)
  const scriptPath = fileURLToPath(
    new URL(`../serve/${config.serveScript}`, import.meta.url),
  )
  const scriptArgs = [scriptPath, appDir, ...(config.serveArgs ?? [])]

  const proc = spawn('node', scriptArgs, {
    env: { ...process.env, PORT: String(SERVER_SIDE_RENDERED_PORT) },
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
    waitForServer(
      `http://localhost:${SERVER_SIDE_RENDERED_PORT}/server-side-rendered`,
    ),
    exitPromise,
  ])

  return () => {
    if (!exited) proc.kill('SIGTERM')
  }
}

export async function runServerSideRenderedBenchmark(
  packageName: string,
  runs = 5,
): Promise<ServerSideRenderedBenchmarkResult> {
  const config = SERVER_SIDE_RENDERED_FRAMEWORKS.find(
    (f) => f.package === packageName,
  )

  if (!config) {
    throw new Error(
      `Unknown server side rendered package: ${packageName}. Available: ${SERVER_SIDE_RENDERED_FRAMEWORKS.map((f) => f.package).join(', ')}`,
    )
  }

  console.info(`Starting server for ${config.displayName}...`)
  const killServer = await spawnServer(config)

  try {
    console.info(
      `Running server side rendered benchmark for ${config.displayName}...`,
    )
    return await runBenchmark(
      `http://localhost:${SERVER_SIDE_RENDERED_PORT}`,
      config.name,
      config.displayName,
      runs,
    )
  } finally {
    killServer()
  }
}
