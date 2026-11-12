import assert from 'node:assert/strict'
import { test } from 'node:test'
import { InitialLoadResourceTypeSchema } from '@framework-performance/results'
import { parseResourceSummary } from './initialLoad/run-benchmark.ts'

const items = InitialLoadResourceTypeSchema.options.map((resourceType) => ({
  resourceType,
  requestCount: 1,
  transferSize: 100,
}))

test('initial load retains Lighthouse totals without adding third-party again', () => {
  const result = parseResourceSummary({ type: 'table', items })
  assert.deepEqual(result.resources.total, {
    requestCount: { value: 1, unit: 'requests' },
    transferSize: { value: 100, unit: 'bytes' },
  })
  assert.equal('iterations' in result, false)
})

test('initial load rejects missing, duplicate, or invalid resource rows', () => {
  for (const details of [
    undefined,
    { type: 'table', items: items.slice(1) },
    { type: 'table', items: [...items, items[0]] },
    {
      type: 'table',
      items: [{ ...items[0], transferSize: -1 }, ...items.slice(1)],
    },
  ]) {
    assert.throws(() => parseResourceSummary(details))
  }
})
