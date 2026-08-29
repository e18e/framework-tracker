import assert from 'node:assert/strict'
import test from 'node:test'
import { parseRunFrequency } from './benchmark-utils.ts'

test('uses the default run frequency when one is not provided', () => {
  assert.equal(parseRunFrequency(undefined), 5)
  assert.equal(parseRunFrequency(undefined, 3), 3)
})

test('accepts a positive integer run frequency', () => {
  assert.equal(parseRunFrequency('1'), 1)
  assert.equal(parseRunFrequency('10'), 10)
})

test('rejects invalid run frequencies', () => {
  for (const value of ['0', '-1', '1.5', 'abc', '2runs']) {
    assert.throws(() => parseRunFrequency(value), /positive integer/)
  }
})
