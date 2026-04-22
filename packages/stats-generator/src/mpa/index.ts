import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { packagesDir } from '../constants.ts'
import { runBenchmark } from './run-benchmark.ts'
import type { MPABenchmarkResult } from './types.ts'

const MPA_PORT = 3002

interface MPAFrameworkConfig {
  name: string
  displayName: string
  package: string
  serveScript: string
  serveArgs?: string[]
}

const MPA_FRAMEWORKS: MPAFrameworkConfig[] = [
  {
    name: 'astro-mpa',
    displayName: 'Astro MPA',
    package: 'app-astro',
    serveScript: 'astro.ts',
  },
  {
    name: 'next-mpa',
    displayName: 'Next.js MPA',
    package: 'app-next-js',
    serveScript: 'next.ts',
  },
  {
    name: 'nuxt-mpa',
    displayName: 'Nuxt MPA',
    package: 'app-nuxt',
    serveScript: 'nitro.ts',
  },
  {
    name: 'react-router-mpa',
    displayName: 'React Router MPA',
    package: 'app-react-router',
    serveScript: 'react-router.ts',
  },
  {
    name: 'solid-start-mpa',
    displayName: 'SolidStart MPA',
    package: 'app-solid-start',
    serveScript: 'nitro.ts',
  },
  {
    name: 'sveltekit-mpa',
    displayName: 'SvelteKit MPA',
    package: 'app-sveltekit',
    serveScript: 'sveltekit.ts',
  },
  {
    name: 'tanstack-start-mpa',
    displayName: 'TanStack Start MPA',
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

async function spawnServer(config: MPAFrameworkConfig): Promise<() => void> {
  const appDir = join(packagesDir, config.package)
  const scriptPath = fileURLToPath(
    new URL(`../serve/${config.serveScript}`, import.meta.url),
  )
  const scriptArgs = [scriptPath, appDir, ...(config.serveArgs ?? [])]

  const proc = spawn('node', scriptArgs, {
    env: { ...process.env, PORT: String(MPA_PORT) },
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
    waitForServer(`http://localhost:${MPA_PORT}/mpa`),
    exitPromise,
  ])

  return () => {
    if (!exited) proc.kill('SIGTERM')
  }
}

export async function runMPABenchmark(
  packageName: string,
  runs = 5,
): Promise<MPABenchmarkResult> {
  const config = MPA_FRAMEWORKS.find((f) => f.package === packageName)

  if (!config) {
    throw new Error(
      `Unknown MPA package: ${packageName}. Available: ${MPA_FRAMEWORKS.map((f) => f.package).join(', ')}`,
    )
  }

  console.info(`Starting server for ${config.displayName}...`)
  const killServer = await spawnServer(config)

  try {
    console.info(`Running MPA benchmark for ${config.displayName}...`)
    return await runBenchmark(
      `http://localhost:${MPA_PORT}`,
      config.name,
      config.displayName,
      runs,
    )
  } finally {
    killServer()
  }
}
