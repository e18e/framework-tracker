import assert from 'node:assert/strict'
import { once } from 'node:events'
import test from 'node:test'
import {
  IncomingMessage,
  ServerResponse,
} from './ssrRequestThroughput/mock-http.ts'
import { consumeWebResponse } from './ssrRequestThroughput/run-benchmark.ts'

test('timed Web responses drain every chunk without collecting the body', async () => {
  const chunks = [new Uint8Array([1, 2]), new Uint8Array([3, 4, 5])]
  let completed = false
  const response = new Response(
    new ReadableStream<Uint8Array>({
      pull(controller) {
        const chunk = chunks.shift()
        if (chunk) {
          controller.enqueue(chunk)
        } else {
          controller.close()
          completed = true
        }
      },
    }),
  )
  Object.defineProperty(response, 'arrayBuffer', {
    value: async () => {
      throw new Error('Timed runs must not buffer the whole response')
    },
  })

  assert.deepEqual(await consumeWebResponse(response, false), {
    body: '',
    length: 5,
  })
  assert.equal(completed, true)
  assert.equal(response.bodyUsed, true)
})

test('validation runs still collect the complete Web response', async () => {
  const html = '<table>✓</table>'
  const response = new Response(html)

  assert.deepEqual(await consumeWebResponse(response, true), {
    body: html,
    length: new TextEncoder().encode(html).byteLength,
  })
})

test('Node mock counts every byte and collects the body only for validation', async () => {
  const html = '<table>✓</table>'
  for (const collect of [false, true]) {
    const response = new ServerResponse(new IncomingMessage(), collect)
    response.write('<table>')
    response.end('✓</table>')
    await response.await

    assert.equal(response.length, Buffer.byteLength(html))
    assert.equal(response.body, collect ? html : '')
  }
})

test(
  'Node handlers can drain the empty request after sending a response',
  { timeout: 1000 },
  async () => {
    for (const collect of [false, true]) {
      const request = new IncomingMessage('/ssr-throughput')
      const response = new ServerResponse(request, collect)
      let chunks = 0
      request.on('data', () => chunks++)
      const requestEnded = once(request, 'end')

      // SvelteKit's Node adapter resumes unconsumed requests after responding.
      response.once('finish', () => request.resume())
      response.end('<table>✓</table>')
      await Promise.all([response.await, requestEnded])

      assert.equal(chunks, 0)
      assert.equal(request.readableEnded, true)
      assert.equal(response.statusCode, 200)
      assert.equal(response.length, Buffer.byteLength('<table>✓</table>'))
      assert.equal(response.body, collect ? '<table>✓</table>' : '')
    }
  },
)
