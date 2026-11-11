import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { test } from 'node:test'
import {
  startBenchmarkServer,
  waitForBenchmarkServer,
} from './benchmark-server.ts'

test('readiness deadline interrupts a server that never responds', async () => {
  const server = createServer(() => {})
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  try {
    await assert.rejects(
      waitForBenchmarkServer(
        `http://127.0.0.1:${address.port}`,
        AbortSignal.timeout(100),
      ),
      { name: 'TimeoutError' },
    )
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})

test('shared launcher still serves existing Node apps and stops their process', async () => {
  const reservation = createServer()
  await new Promise<void>((resolve) =>
    reservation.listen(0, '127.0.0.1', resolve),
  )
  const address = reservation.address()
  assert.ok(address && typeof address !== 'string')
  await new Promise<void>((resolve) => reservation.close(() => resolve()))
  const url = `http://127.0.0.1:${address.port}/server-side-rendered`
  const stop = await startBenchmarkServer(
    { package: 'app-baseline-html', serveScript: 'baseline-html.ts' },
    {
      host: '127.0.0.1',
      port: address.port,
      readinessPath: '/server-side-rendered',
    },
  )
  try {
    const response = await fetch(url)
    assert.equal(response.status, 200)
    assert.equal((await response.text()).match(/<tr>/g)?.length, 1000)
  } finally {
    stop()
  }
  const deadline = AbortSignal.timeout(5000)
  while (true) {
    deadline.throwIfAborted()
    try {
      const response = await fetch(url, { signal: deadline })
      await response.body?.cancel()
    } catch {
      deadline.throwIfAborted()
      break
    }
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
})

test('missing native executable fails startup instead of waiting for readiness', async () => {
  await assert.rejects(
    startBenchmarkServer(
      { package: 'app-webui', serveBinary: 'missing-benchmark-executable' },
      { host: '127.0.0.1', port: 0, readinessPath: '/' },
    ),
    (error: unknown) =>
      error instanceof Error &&
      error.cause instanceof Error &&
      'code' in error.cause &&
      error.cause.code === 'ENOENT',
  )
})
