import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { packagesDir } from '../constants.ts'
import { runBenchmark } from './run-benchmark.ts'
import type { SPABenchmarkResult } from './types.ts'

const SPA_PORT = 3001

interface SPAFrameworkConfig {
  name: string
  displayName: string
  package: string
  /** Filename of the serve script in src/serve/ */
  serveScript: string
  /** Additional arguments passed to the serve script after <app-dir> */
  serveArgs?: string[]
}

const SPA_FRAMEWORKS: SPAFrameworkConfig[] = [
  {
    name: 'astro-spa',
    displayName: 'Astro SPA',
    package: 'app-astro',
    serveScript: 'astro.ts',
  },
  {
    name: 'next-spa',
    displayName: 'Next.js SPA',
    package: 'app-next-js',
    serveScript: 'next.ts',
  },
  {
    name: 'nuxt-spa',
    displayName: 'Nuxt SPA',
    package: 'app-nuxt',
    serveScript: 'nitro.ts',
  },
  {
    name: 'react-router-spa',
    displayName: 'React Router SPA',
    package: 'app-react-router',
    serveScript: 'static-spa.ts',
  },
  {
    name: 'solid-start-spa',
    displayName: 'SolidStart SPA',
    package: 'app-solid-start',
    serveScript: 'nitro.ts',
  },
  {
    name: 'sveltekit-spa',
    displayName: 'SvelteKit SPA',
    package: 'app-sveltekit',
    serveScript: 'sveltekit.ts',
  },
  {
    name: 'tanstack-start-spa',
    displayName: 'TanStack Start SPA',
    package: 'app-tanstack-start-react',
    serveScript: 'tanstack-start.ts',
  },
]

async function waitForServer(url: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.status < 500) return
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`)
}

async function spawnServer(config: SPAFrameworkConfig): Promise<() => void> {
  const appDir = join(packagesDir, config.package)
  const scriptPath = fileURLToPath(
    new URL(`../serve/${config.serveScript}`, import.meta.url),
  )
  const scriptArgs = [scriptPath, appDir, ...(config.serveArgs ?? [])]

  const proc = spawn('node', scriptArgs, {
    env: { ...process.env, PORT: String(SPA_PORT) },
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
    waitForServer(`http://localhost:${SPA_PORT}/`),
    exitPromise,
  ])

  return () => {
    if (!exited) proc.kill('SIGTERM')
  }
}

export async function runSPABenchmark(
  packageName: string,
  runs = 5,
): Promise<SPABenchmarkResult> {
  const config = SPA_FRAMEWORKS.find((f) => f.package === packageName)

  if (!config) {
    throw new Error(
      `Unknown SPA package: ${packageName}. Available: ${SPA_FRAMEWORKS.map((f) => f.package).join(', ')}`,
    )
  }

  console.info(`Starting server for ${config.displayName}...`)
  const killServer = await spawnServer(config)

  try {
    console.info(`Running SPA benchmark for ${config.displayName}...`)
    return await runBenchmark(
      `http://localhost:${SPA_PORT}`,
      config.name,
      config.displayName,
      runs,
    )
  } finally {
    killServer()
  }
}
