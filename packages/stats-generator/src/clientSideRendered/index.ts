import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { packagesDir } from '../constants.ts'
import { runBenchmark } from './run-benchmark.ts'
import type { ClientSideRenderedBenchmarkResult } from './types.ts'

const CLIENT_SIDE_RENDERED_PORT = 3001

interface ClientSideRenderedFrameworkConfig {
  name: string
  displayName: string
  package: string
  /** Filename of the serve script in src/serve/ */
  serveScript: string
}

const CLIENT_SIDE_RENDERED_FRAMEWORKS: ClientSideRenderedFrameworkConfig[] = [
  {
    name: 'astro-client-side-rendered',
    displayName: 'Astro Client Side Rendered',
    package: 'app-astro',
    serveScript: 'astro.ts',
  },
  {
    name: 'next-client-side-rendered',
    displayName: 'Next.js Client Side Rendered',
    package: 'app-next-js',
    serveScript: 'next.ts',
  },
  {
    name: 'nuxt-client-side-rendered',
    displayName: 'Nuxt Client Side Rendered',
    package: 'app-nuxt',
    serveScript: 'nitro.ts',
  },
  {
    name: 'react-router-client-side-rendered',
    displayName: 'React Router Client Side Rendered',
    package: 'app-react-router',
    serveScript: 'react-router.ts',
  },
  {
    name: 'solid-start-client-side-rendered',
    displayName: 'SolidStart Client Side Rendered',
    package: 'app-solid-start',
    serveScript: 'nitro.ts',
  },
  {
    name: 'sveltekit-client-side-rendered',
    displayName: 'SvelteKit Client Side Rendered',
    package: 'app-sveltekit',
    serveScript: 'sveltekit.ts',
  },
  {
    name: 'tanstack-start-client-side-rendered',
    displayName: 'TanStack Start Client Side Rendered',
    package: 'app-tanstack-start-react',
    serveScript: 'tanstack-start.ts',
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
  config: ClientSideRenderedFrameworkConfig,
): Promise<() => void> {
  const appDir = join(packagesDir, config.package)
  const scriptPath = fileURLToPath(
    new URL(`../serve/${config.serveScript}`, import.meta.url),
  )

  const proc = spawn('node', [scriptPath, appDir], {
    env: { ...process.env, PORT: String(CLIENT_SIDE_RENDERED_PORT) },
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
      `http://localhost:${CLIENT_SIDE_RENDERED_PORT}/client-side-rendered`,
    ),
    exitPromise,
  ])

  return () => {
    if (!exited) proc.kill('SIGTERM')
  }
}

export async function runClientSideRenderedBenchmark(
  packageName: string,
  runs = 5,
): Promise<ClientSideRenderedBenchmarkResult> {
  const config = CLIENT_SIDE_RENDERED_FRAMEWORKS.find(
    (f) => f.package === packageName,
  )

  if (!config) {
    throw new Error(
      `Unknown client-side rendered package: ${packageName}. Available: ${CLIENT_SIDE_RENDERED_FRAMEWORKS.map((f) => f.package).join(', ')}`,
    )
  }

  console.info(`Starting server for ${config.displayName}...`)
  const killServer = await spawnServer(config)

  try {
    console.info(
      `Running client-side rendered benchmark for ${config.displayName}...`,
    )
    return await runBenchmark(
      `http://localhost:${CLIENT_SIDE_RENDERED_PORT}`,
      config.name,
      config.displayName,
      runs,
    )
  } finally {
    killServer()
  }
}
