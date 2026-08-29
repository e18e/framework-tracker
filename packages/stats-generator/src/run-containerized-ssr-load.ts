import { spawn } from 'node:child_process'
import { cwd, env, exit, getgid, getuid, pid } from 'node:process'
import { parseArgs } from './utils.ts'

const RUN_SUFFIX = `${env.GITHUB_RUN_ID ?? 'local'}-${pid}`
const NETWORK_NAME = `framework-tracker-ssr-load-${RUN_SUFFIX}`
const SERVER_NAME = `framework-tracker-ssr-load-server-${RUN_SUFFIX}`
const LOAD_GENERATOR_NAME = `framework-tracker-ssr-load-generator-${RUN_SUFFIX}`
const NODE_IMAGE = 'node:24-bookworm-slim'

function runDocker(
  args: string[],
  stdio: 'ignore' | 'inherit' = 'inherit',
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, { stdio })
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(
        new Error(
          `docker ${args[0]} failed${signal ? ` with signal ${signal}` : ` with exit code ${code}`}`,
        ),
      )
    })
  })
}

async function ignoreDockerFailure(
  args: string[],
  stdio: 'ignore' | 'inherit' = 'ignore',
): Promise<void> {
  try {
    await runDocker(args, stdio)
  } catch {
    // Cleanup must not hide the benchmark result.
  }
}

async function main() {
  const { packageName } = parseArgs(
    'Usage: run-containerized-ssr-load <package-name>\nExample: run-containerized-ssr-load app-astro',
  )
  const workspaceDir = env.GITHUB_WORKSPACE ?? cwd()
  const user = `${getuid?.() ?? 0}:${getgid?.() ?? 0}`
  let cleanupPromise: Promise<void> | undefined

  const cleanup = (showServerLogs = false): Promise<void> => {
    cleanupPromise ??= (async () => {
      if (showServerLogs) {
        await ignoreDockerFailure(['logs', SERVER_NAME], 'inherit')
      }
      await ignoreDockerFailure([
        'rm',
        '--force',
        LOAD_GENERATOR_NAME,
        SERVER_NAME,
      ])
      await ignoreDockerFailure(['network', 'rm', NETWORK_NAME])
    })()
    return cleanupPromise
  }

  process.once('SIGINT', () => {
    void cleanup().finally(() => exit(130))
  })
  process.once('SIGTERM', () => {
    void cleanup().finally(() => exit(143))
  })

  let succeeded = false
  try {
    await runDocker(['network', 'create', NETWORK_NAME], 'ignore')

    await runDocker([
      'run',
      '--detach',
      '--name',
      SERVER_NAME,
      '--network',
      NETWORK_NAME,
      '--cpuset-cpus',
      '0-11',
      '--user',
      user,
      '--volume',
      `${workspaceDir}:/workspace`,
      '--workdir',
      '/workspace',
      NODE_IMAGE,
      'node',
      'packages/stats-generator/src/run-ssr-load-server.ts',
      packageName,
    ])

    await runDocker([
      'run',
      '--name',
      LOAD_GENERATOR_NAME,
      '--network',
      NETWORK_NAME,
      '--cpuset-cpus',
      '12-15',
      '--user',
      user,
      '--volume',
      `${workspaceDir}:/workspace`,
      '--workdir',
      '/workspace',
      '--env',
      'RUNNER_LABEL',
      '--env',
      `SSR_LOAD_TARGET_URL=http://${SERVER_NAME}:3003/server-side-rendered`,
      NODE_IMAGE,
      'node',
      'packages/stats-generator/src/run-ssr-load-benchmark.ts',
      packageName,
    ])
    succeeded = true
  } finally {
    await cleanup(!succeeded)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
