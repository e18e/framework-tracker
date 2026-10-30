import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { test } from 'node:test'
import { waitForBenchmarkServer } from './benchmark-server.ts'

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
