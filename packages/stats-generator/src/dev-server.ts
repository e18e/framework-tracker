import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import http from 'node:http'
import net from 'node:net'
import { setTimeout as sleep } from 'node:timers/promises'

export const LOOPBACK_ADDRESSES = ['127.0.0.1', '::1']

const INHERITED_ENV = ['PATH', 'HOME', 'TMPDIR', 'LANG', 'LC_ALL']

// Astro switches to a detached "background" dev server when it detects an AI
// agent terminal through env vars such as CLAUDECODE, so the caller's
// environment must not leak into the measured process.
export function devServerEnv(source = process.env): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ASTRO_TELEMETRY_DISABLED: '1',
    NEXT_TELEMETRY_DISABLED: '1',
    NUXT_TELEMETRY_DISABLED: '1',
    DO_NOT_TRACK: '1',
    CI: '1',
    NO_COLOR: '1',
    BROWSER: 'none',
  }
  for (const name of INHERITED_ENV) {
    if (source[name] !== undefined) env[name] = source[name]
  }
  return env
}

export interface ProbeResult {
  status: number | null
  errorCode?: string
}

function ipFamily(address: string): 4 | 6 {
  return address.includes(':') ? 6 : 4
}

// Mastro serves its dev routes only when the request hostname is `localhost`,
// and fetch() refuses to send a custom Host header, so this uses node:http.
export function probeOnce(
  address: string,
  port: number,
  timeoutMs: number,
): Promise<ProbeResult> {
  return new Promise((resolve) => {
    const request = http.request(
      {
        host: address,
        port,
        path: '/',
        method: 'GET',
        family: ipFamily(address),
        agent: false,
        setHost: false,
        headers: { host: `localhost:${port}`, connection: 'close' },
        timeout: timeoutMs,
      },
      (response) => {
        resolve({ status: response.statusCode ?? null })
        response.resume()
      },
    )
    request.on('timeout', () => request.destroy(new Error('ETIMEDOUT')))
    request.on('error', (error: NodeJS.ErrnoException) =>
      resolve({ status: null, errorCode: error.code ?? error.message }),
    )
    request.end()
  })
}

export interface WaitForHttpOkOptions {
  port: number
  addresses?: string[]
  pollIntervalMs?: number
  requestTimeoutMs?: number
  timeoutMs?: number
  signal?: AbortSignal
}

export interface HttpOkResult {
  elapsedMs: number
  address: string
  observedStatuses: number[]
}

export async function waitForHttpOk(
  startedAt: number,
  options: WaitForHttpOkOptions,
): Promise<HttpOkResult> {
  const {
    port,
    addresses = LOOPBACK_ADDRESSES,
    pollIntervalMs = 25,
    requestTimeoutMs = 30_000,
    timeoutMs = 120_000,
    signal,
  } = options
  const deadline = startedAt + timeoutMs
  const observedStatuses = new Set<number>()

  while (!signal?.aborted) {
    const remainingMs = deadline - performance.now()
    if (remainingMs <= 0) break

    const attempts = addresses.map(async (address) => {
      const result = await probeOnce(
        address,
        port,
        Math.min(requestTimeoutMs, remainingMs),
      )
      if (result.status === 200) {
        return { address, elapsedMs: performance.now() - startedAt }
      }
      if (result.status !== null) observedStatuses.add(result.status)
      throw result
    })

    try {
      const { address, elapsedMs } = await Promise.any(attempts)
      return { elapsedMs, address, observedStatuses: [...observedStatuses] }
    } catch {}

    try {
      await sleep(pollIntervalMs, undefined, { signal })
    } catch {
      break
    }
  }

  const statuses = [...observedStatuses]
  const seen =
    statuses.length > 0 ? ` (saw statuses ${statuses.join(', ')})` : ''
  if (signal?.aborted) {
    throw new Error(
      `Stopped waiting for http://localhost:${port}/ before it returned 200${seen}`,
    )
  }
  throw new Error(
    `No HTTP 200 from http://localhost:${port}/ within ${timeoutMs}ms${seen}`,
  )
}

function canConnect(address: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({
      host: address,
      port,
      family: ipFamily(address),
    })
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
  })
}

export async function isPortListening(
  port: number,
  addresses = LOOPBACK_ADDRESSES,
): Promise<boolean> {
  const results = await Promise.all(
    addresses.map((address) => canConnect(address, port)),
  )
  return results.some(Boolean)
}

export async function waitForPortFree(
  port: number,
  timeoutMs: number,
): Promise<void> {
  const deadline = performance.now() + timeoutMs
  while (await isPortListening(port)) {
    if (performance.now() > deadline) {
      throw new Error(
        `Port ${port} is still in use ${timeoutMs}ms after stopping the dev server`,
      )
    }
    await sleep(50)
  }
}

export function advertisedPorts(output: string): number[] {
  const ports = new Set<number>()
  for (const match of output.matchAll(/https?:\/\/[^\s/]+:(\d{2,5})/g)) {
    ports.add(Number(match[1]))
  }
  return [...ports]
}

function descendantsOf(rootPid: number): number[] {
  const children = new Map<number, number[]>()
  const table = execFileSync('ps', ['-axo', 'pid=,ppid='], {
    encoding: 'utf-8',
  })
  for (const row of table.trim().split('\n')) {
    const [pid, ppid] = row.trim().split(/\s+/).map(Number)
    if (pid === undefined || ppid === undefined) continue
    const siblings = children.get(ppid) ?? []
    siblings.push(pid)
    children.set(ppid, siblings)
  }

  const descendants: number[] = []
  const stack = [rootPid]
  for (let parent = stack.pop(); parent !== undefined; parent = stack.pop()) {
    for (const child of children.get(parent) ?? []) {
      descendants.push(child)
      stack.push(child)
    }
  }
  return descendants
}

// EPERM: the pid was recycled by a process we do not own between the ps
// snapshot and the signal.
function signalPid(pid: number, signal: NodeJS.Signals): void {
  try {
    process.kill(pid, signal)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== 'ESRCH' && code !== 'EPERM') throw error
  }
}

// Astro re-spawns its dev server detached when it detects an agent terminal,
// so the process group alone is not enough; `node --watch` (Mastro) restarts
// children, so the descendant list alone is not enough either.
export async function killProcessTree(
  child: ChildProcess,
  graceMs = 5_000,
): Promise<void> {
  const pid = child.pid
  if (pid === undefined || child.exitCode !== null || child.signalCode !== null)
    return

  const targets = [-pid, ...descendantsOf(pid)]
  const signalAll = (signal: NodeJS.Signals) => {
    for (const target of targets) signalPid(target, signal)
  }

  const exited = once(child, 'exit')
  signalAll('SIGTERM')
  const escalation = setTimeout(() => signalAll('SIGKILL'), graceMs)
  escalation.unref()
  await exited
  clearTimeout(escalation)
  signalAll('SIGKILL')
}

export interface DevServerExit {
  code: number | null
  signal: NodeJS.Signals | null
}

export interface DevServerHandle {
  child: ChildProcess
  startedAt: number
  exited: Promise<DevServerExit>
  stop: () => Promise<void>
}

export function spawnDevServer(
  projectDir: string,
  onOutput: (text: string) => void,
): DevServerHandle {
  const startedAt = performance.now()
  const child = spawn('pnpm', ['dev'], {
    cwd: projectDir,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: devServerEnv(),
  })

  const forward = (chunk: Buffer) => onOutput(chunk.toString())
  child.stdout?.on('data', forward)
  child.stderr?.on('data', forward)

  const exited = new Promise<DevServerExit>((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', (code, signal) => resolve({ code, signal }))
  })

  return { child, startedAt, exited, stop: () => killProcessTree(child) }
}
