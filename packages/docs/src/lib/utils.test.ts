import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  FormattedTime,
  FormattedValue,
  formatTextTime,
  formatTextValue,
  formatTime,
  formatValue,
} from './utils.ts'
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

test('formatTime keeps milliseconds and converts only the text', () => {
  assert.equal(formatTextTime(1234, 'ms'), '1234 ms')
  assert.equal(formatTextTime(1234, 's', { sigFigs: 2 }), '1.23s')
  assert.equal(formatTextTime(12.345, 'ms', { sigFigs: 1 }), '12.3 ms')

  const formatted = formatTime(1500, 's', { sigFigs: 1 })
  assert.ok(formatted instanceof FormattedTime)
  assert.ok(formatted instanceof FormattedValue)
  assert.equal(formatted.value, 1500)
  assert.equal(formatted.format, 's')
  assert.equal(`${formatted}`, '1.5s')
})

test('formatTime returns a null value and "—" for invalid input', () => {
  for (const input of [null, undefined, Number.NaN, Infinity, -1]) {
    const formatted = formatTime(input, 's', { sigFigs: 2 })
    assert.ok(formatted instanceof FormattedTime)
    assert.equal(formatted.value, null)
    assert.equal(formatted.format, 's')
    assert.equal(`${formatted}`, '—')
    assert.equal(formatTextTime(input, 'ms'), '—')
  }
  assert.equal(formatTime(0, 's').value, 0)
})
