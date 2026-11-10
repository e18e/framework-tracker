import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FormattedValue, formatTextValue, formatValue } from './utils.ts'
import type { ChartValueFormat } from './types.ts'

const FORMATS: ChartValueFormat[] = ['count', 'mb', 'kb', 'ms', 's']

test('formatValue keeps the raw value and format alongside the text', () => {
  for (const format of FORMATS) {
    for (const value of [0, 2, 1.5, -3.25]) {
      for (const prefixPositive of [false, true]) {
        const ops = { prefixPositive, sigFigs: 2 }
        const formatted = formatValue(value, format, ops)
        const text = formatTextValue(value, format, ops)
        assert.ok(formatted instanceof FormattedValue)
        assert.equal(formatted.value, value)
        assert.equal(formatted.format, format)
        assert.equal(formatted.text, text)
      }
    }
  }
})

test('FormattedValue stringifies to its display text', () => {
  const formatted = formatValue(1.5, 'mb', { sigFigs: 2 })
  assert.equal(String(formatted), '1.50 MB')
  assert.equal(`${formatted}`, '1.50 MB')
  assert.equal(JSON.stringify({ formatted }), '{"formatted":"1.50 MB"}')
})

test('formatTextValue defaults to 0 decimals and applies sigFigs', () => {
  assert.equal(formatTextValue(1.5, 'ms'), '2 ms')
  assert.equal(formatTextValue(1.234, 'kb', { sigFigs: 2 }), '1.23 KB')
  assert.equal(formatTextValue(1.6, 'count', { sigFigs: 2 }), '2')
  assert.equal(formatTextValue(3, 's', { prefixPositive: true }), '+3s')
  assert.equal(formatTextValue(-3, 's', { prefixPositive: true }), '-3s')
})
