import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  copyTrackedProject,
  installDependencies,
  parseRunFrequency,
} from './benchmark-utils.ts'
import { packagesDir } from './constants.ts'
import {
  advertisedPorts,
  isPortListening,
  spawnDevServer,
  waitForHttpOk,
  waitForPortFree,
  type DevServerHandle,
} from './dev-server.ts'
import { summarizeSamples } from './sample-statistics.ts'
import type { DevServerStats } from './types.ts'
import { getFrameworkByPackage, parseArgs, writeJsonFile } from './utils.ts'

const READY_TIMEOUT_MS = 120_000
const PORT_FREE_TIMEOUT_MS = 10_000
const OUTPUT_TAIL_LINES = 50

let activeServer: DevServerHandle | null = null

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    await activeServer?.stop()
    process.exit(130)
  })
}

async function measureStartTime(
  packageName: string,
  projectDir: string,
  port: number,
): Promise<number> {
  if (await isPortListening(port)) {
    throw new Error(
      `Port ${port} is already in use; the dev server would start elsewhere and the measurement would be wrong`,
    )
  }

  const outputTail: string[] = []
  const server = spawnDevServer(projectDir, (text) => {
    process.stdout.write(`[${packageName}] ${text}`)
    outputTail.push(...text.split('\n').filter((line) => line.trim()))
    outputTail.splice(0, Math.max(0, outputTail.length - OUTPUT_TAIL_LINES))
  })
  activeServer = server

  const abort = new AbortController()
  const exitedEarly = server.exited.then(({ code, signal }) => {
    abort.abort()
    throw new Error(
      `Dev server exited before returning 200 (code=${code}, signal=${signal})`,
    )
  })
  exitedEarly.catch(() => {})

  try {
    const { elapsedMs, address } = await Promise.race([
      waitForHttpOk(server.startedAt, {
        port,
        timeoutMs: READY_TIMEOUT_MS,
        signal: abort.signal,
      }),
      exitedEarly,
    ])
    console.info(
      `  First 200 from ${address}:${port} after ${Math.round(elapsedMs)}ms`,
    )
    return Math.round(elapsedMs)
  } catch (error) {
    const seen = advertisedPorts(outputTail.join('\n')).filter(
      (p) => p !== port,
    )
    const hint =
      seen.length > 0
        ? `\nThe server advertised port ${seen.join(', ')} but devServerPort is ${port}.`
        : ''
    throw new Error(
      `${(error as Error).message}${hint}\nLast output:\n${outputTail.join('\n')}`,
    )
  } finally {
    abort.abort()
    await server.stop()
    activeServer = null
    await waitForPortFree(port, PORT_FREE_TIMEOUT_MS)
  }
}

async function main() {
  const { packageName, args } = parseArgs(
    'Usage: run-dev-server-benchmark <package-name> [run-frequency]\nExample: run-dev-server-benchmark starter-astro 5',
  )

  const runFrequency = parseRunFrequency(args[0])

  const { framework, testConfig } = await getFrameworkByPackage(packageName)
  const port = testConfig.devServerPort
  if (port === undefined) {
    throw new Error(
      `${packageName} has no devServerPort in .github/frameworks.json`,
    )
  }

  console.info(
    `Running dev server benchmark for ${framework.displayName} (${packageName})...\n`,
  )

  const packageDir = join(packagesDir, packageName)
  const tempDir = join(
    tmpdir(),
    `framework-dev-server-benchmark-${packageName}-${Date.now()}`,
  )
  const storeDir = join(tempDir, 'store')
  const cacheDir = join(tempDir, 'cache')

  const startTimesMs: number[] = []
  let previousRunDir = ''

  try {
    for (let i = 1; i <= runFrequency; i++) {
      if (previousRunDir) {
        rmSync(previousRunDir, { recursive: true, force: true })
      }

      const runDir = join(tempDir, `run-${i}`)
      const projectDir = join(runDir, 'project')
      copyTrackedProject(packageDir, projectDir)

      console.info(`\nDev server run ${i}/${runFrequency}...`)
      console.info('Installing dependencies outside the timed region...')
      installDependencies(projectDir, storeDir, cacheDir)

      console.info('Starting dev server...')
      startTimesMs.push(await measureStartTime(packageName, projectDir, port))

      previousRunDir = runDir
    }

    const devServerStartTime = summarizeSamples(startTimesMs)
    console.info(`\nAvg dev server start time: ${devServerStartTime.avgMs} ms`)
    console.info(
      `\nDev server start standard deviation: ${devServerStartTime.standardDeviationMs} ms`,
    )
    console.info(`\nMin dev server start time: ${devServerStartTime.minMs} ms`)
    console.info(`\nMax dev server start time: ${devServerStartTime.maxMs} ms`)

    const stats: DevServerStats = { devServerStartTime }
    const outputPath = join(packagesDir, packageName, 'dev-server-stats.json')
    writeJsonFile(outputPath, stats)

    console.info(`\n✓ Saved dev server stats to ${outputPath}`)
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error('Dev server benchmark failed:', error)
  process.exit(1)
})
