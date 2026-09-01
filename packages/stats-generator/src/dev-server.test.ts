import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import http from 'node:http'
import net from 'node:net'
import test from 'node:test'
import { setTimeout as sleep } from 'node:timers/promises'
import {
  advertisedPorts,
  devServerEnv,
  isPortListening,
  killProcessTree,
  probeOnce,
  waitForHttpOk,
  waitForPortFree,
} from './dev-server.ts'

async function listen(
  handler: http.RequestListener,
  host: string,
): Promise<{ server: http.Server; port: number }> {
  const server = http.createServer(handler)
  server.listen(0, host)
  await once(server, 'listening')
  const address = server.address() as net.AddressInfo
  return { server, port: address.port }
}

async function close(server: http.Server): Promise<void> {
  server.closeAllConnections()
  server.close()
  await once(server, 'close')
}

async function waitForExit(pid: number, timeoutMs: number): Promise<void> {
  const deadline = performance.now() + timeoutMs
  while (performance.now() < deadline) {
    try {
      process.kill(pid, 0)
    } catch {
      return
    }
    await sleep(20)
  }
  throw new Error(`pid ${pid} still alive after ${timeoutMs}ms`)
}

async function hasIpv6Loopback(): Promise<boolean> {
  const server = net.createServer()
  try {
    server.listen(0, '::1')
    await once(server, 'listening')
    return true
  } catch {
    return false
  } finally {
    server.close()
  }
}

async function freePort(): Promise<number> {
  const server = net.createServer()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const { port } = server.address() as net.AddressInfo
  server.close()
  await once(server, 'close')
  return port
}

test('probeOnce reports the status and preserves the localhost Host header', async (t) => {
  let hostHeader = ''
  const { server, port } = await listen((req, res) => {
    hostHeader = req.headers.host ?? ''
    res.writeHead(503).end()
  }, '127.0.0.1')
  t.after(() => close(server))

  assert.deepEqual(await probeOnce('127.0.0.1', port, 1000), { status: 503 })
  assert.equal(hostHeader, `localhost:${port}`)
})

test('probeOnce reports a refused connection without throwing', async () => {
  const port = await freePort()
  const result = await probeOnce('127.0.0.1', port, 1000)
  assert.equal(result.status, null)
  assert.equal(result.errorCode, 'ECONNREFUSED')
})

test('waitForHttpOk measures the delay until the first 200 within one poll interval', async (t) => {
  const readyAfterMs = 300
  const startedAt = performance.now()
  const { server, port } = await listen((_req, res) => {
    const ready = performance.now() - startedAt >= readyAfterMs
    res.writeHead(ready ? 200 : 503).end()
  }, '127.0.0.1')
  t.after(() => close(server))

  const result = await waitForHttpOk(startedAt, {
    port,
    addresses: ['127.0.0.1'],
    pollIntervalMs: 25,
  })
  assert.ok(
    result.elapsedMs >= readyAfterMs,
    `${result.elapsedMs} >= ${readyAfterMs}`,
  )
  assert.ok(
    result.elapsedMs < readyAfterMs + 25 + 50,
    `${result.elapsedMs} overshoot`,
  )
  assert.equal(result.address, '127.0.0.1')
  assert.deepEqual(result.observedStatuses, [503])
})

test('waitForHttpOk does not treat a non-200 response as ready', async (t) => {
  const { server, port } = await listen((_req, res) => {
    res.writeHead(503).end()
  }, '127.0.0.1')
  t.after(() => close(server))

  await assert.rejects(
    waitForHttpOk(performance.now(), {
      port,
      addresses: ['127.0.0.1'],
      timeoutMs: 200,
    }),
    /within 200ms \(saw statuses 503\)/,
  )
})

test('waitForHttpOk finds a server bound to a single loopback family', async (t) => {
  const v4 = await listen((_req, res) => res.writeHead(200).end(), '127.0.0.1')
  t.after(() => close(v4.server))
  const found4 = await waitForHttpOk(performance.now(), { port: v4.port })
  assert.equal(found4.address, '127.0.0.1')

  if (!(await hasIpv6Loopback())) {
    t.diagnostic('::1 unavailable, skipping the IPv6 half')
    return
  }
  const v6 = await listen((_req, res) => res.writeHead(200).end(), '::1')
  t.after(() => close(v6.server))
  const found6 = await waitForHttpOk(performance.now(), { port: v6.port })
  assert.equal(found6.address, '::1')
})

test('waitForHttpOk stops promptly when aborted', async () => {
  const port = await freePort()
  const abort = new AbortController()
  const waiting = waitForHttpOk(performance.now(), {
    port,
    signal: abort.signal,
  })
  await sleep(60)
  abort.abort()
  const startedAbort = performance.now()
  await assert.rejects(waiting, /Stopped waiting/)
  assert.ok(performance.now() - startedAbort < 200)
})

test('isPortListening and waitForPortFree track a listener lifecycle', async () => {
  const server = net.createServer()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const { port } = server.address() as net.AddressInfo

  assert.equal(await isPortListening(port), true)
  setTimeout(() => server.close(), 100)
  await waitForPortFree(port, 2000)
  assert.equal(await isPortListening(port), false)
})

test('devServerEnv keeps only the allowlisted variables plus opt-outs', () => {
  const env = devServerEnv({
    PATH: '/usr/bin',
    HOME: '/home/ci',
    CLAUDECODE: '1',
    TERM_PROGRAM: 'vscode',
  })
  assert.equal(env.PATH, '/usr/bin')
  assert.equal(env.HOME, '/home/ci')
  assert.equal(env.CLAUDECODE, undefined)
  assert.equal(env.TERM_PROGRAM, undefined)
  assert.equal(env.ASTRO_TELEMETRY_DISABLED, '1')
  assert.equal(env.CI, '1')
})

test('advertisedPorts extracts ports from server banners', () => {
  const output = [
    '  ➜  Local:   http://localhost:5174/',
    '  ➜  Network: use --host to expose',
    '- Local: http://localhost:3000',
    'Server running at http://localhost:8000',
    'ready in 512 ms',
  ].join('\n')
  assert.deepEqual(advertisedPorts(output), [5174, 3000, 8000])
})

test('killProcessTree kills a SIGTERM-ignoring grandchild and frees its port', async () => {
  const grandchildScript = `
    process.on('SIGTERM', () => {});
    const net = require('node:net');
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      process.stdout.write(JSON.stringify({ pid: process.pid, port: server.address().port }) + '\\n');
    });
  `
  const childScript = `
    const { spawn } = require('node:child_process');
    const grandchild = spawn(process.execPath, ['-e', ${JSON.stringify(grandchildScript)}], { stdio: ['ignore', 'inherit', 'inherit'] });
    setInterval(() => {}, 1000);
  `
  const child = spawn(process.execPath, ['-e', childScript], {
    detached: true,
    stdio: ['ignore', 'pipe', 'inherit'],
  })

  let line = ''
  for await (const chunk of child.stdout) {
    line += chunk.toString()
    if (line.includes('\n')) break
  }
  const grandchild = JSON.parse(line.trim()) as { pid: number; port: number }
  assert.equal(await isPortListening(grandchild.port), true)

  await killProcessTree(child, 300)

  assert.notEqual(child.exitCode ?? child.signalCode, null)
  await waitForExit(grandchild.pid, 2000)
  await waitForPortFree(grandchild.port, 2000)
})

test('killProcessTree is a no-op for a child that already exited', async () => {
  const child = spawn(process.execPath, ['-e', ''], { detached: true })
  await once(child, 'exit')
  await killProcessTree(child, 100)
})
