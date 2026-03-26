import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { packagesDir } from '../constants.ts'
import { runBenchmark } from './run-benchmark.ts'
import type { SPABenchmarkResult } from './types.ts'

const SPA_PORT = 3001

interface SPAFrameworkConfig {
  name: string
  displayName: string
  package: string
}

const SPA_FRAMEWORKS: SPAFrameworkConfig[] = [
  { name: 'astro-spa', displayName: 'Astro SPA', package: 'app-astro' },
  { name: 'next-spa', displayName: 'Next.js SPA', package: 'app-next-js' },
  { name: 'nuxt-spa', displayName: 'Nuxt SPA', package: 'app-nuxt' },
  {
    name: 'react-router-spa',
    displayName: 'React Router SPA',
    package: 'app-react-router',
  },
  {
    name: 'solid-start-spa',
    displayName: 'SolidStart SPA',
    package: 'app-solid-start',
  },
  {
    name: 'sveltekit-spa',
    displayName: 'SvelteKit SPA',
    package: 'app-sveltekit',
  },
  {
    name: 'tanstack-start-spa',
    displayName: 'TanStack Start SPA',
    package: 'app-tanstack-start-react',
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

async function spawnServer(packageName: string): Promise<() => void> {
  const packageDir = join(packagesDir, packageName)

  const proc = spawn('pnpm', ['run', 'serve'], {
    cwd: packageDir,
    env: { ...process.env, PORT: String(SPA_PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  proc.stdout?.on('data', (chunk: Buffer) =>
    process.stdout.write(`[${packageName}] ${chunk}`),
  )
  proc.stderr?.on('data', (chunk: Buffer) =>
    process.stderr.write(`[${packageName}] ${chunk}`),
  )

  let exited = false
  proc.on('exit', (code) => {
    exited = true
    if (code != null && code !== 0) {
      console.error(`[${packageName}] server exited with code ${code}`)
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
  const killServer = await spawnServer(packageName)

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
