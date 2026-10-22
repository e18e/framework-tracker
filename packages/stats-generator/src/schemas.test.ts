import assert from 'node:assert/strict'
import { test } from 'node:test'
import { z } from 'zod'
import { createBenchmarkBaseSchema } from './schemas.ts'

test('common benchmark schema requires identity and one iteration per measured run', () => {
  const schema = createBenchmarkBaseSchema(z.object({ value: z.number() }))
  const complete = { name: 'test', runs: 1, iterations: [{ value: 5 }] }
  assert.deepEqual(schema.parse(complete), complete)
  for (const patch of [
    { name: '' },
    { runs: undefined },
    { runs: 0 },
    { runs: 1.5 },
    { iterations: undefined },
    { iterations: [] },
    { runs: 2 },
  ]) {
    assert.equal(schema.safeParse({ ...complete, ...patch }).success, false)
  }
})
