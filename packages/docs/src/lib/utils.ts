import type { ChartValueFormat } from './types'

const BYTES_PER_KB = 1024
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB

/**
 * Returns the URL slug for a framework details page.
 * Strips the "starter-" or "app-" prefix from the package name so that
 * devtime (starter-*) and runtime (app-*) entries share the same slug.
 * Used by getStaticPaths and by homepage framework links.
 *
 */
export function getFrameworkSlug(pkg: string): string {
  return pkg.replace(/^starter-/, '').replace(/^app-/, '')
}

/**
 * Formats a byte count as megabytes with two decimal places (e.g. "558.50MB").
 * Callers should pass a finite, non-negative number; otherwise returns "—".
 */
export function formatBytesToMB(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  const mb = bytes / BYTES_PER_MB
  return `${mb.toFixed(2)}MB`
}

export interface FormatOptions {
  prefixPositive?: boolean
  /** Decimal places for non-count formats. Defaults to 0. */
  sigFigs?: number
}

/**
 * Compile-time tag: a string produced by `formatTextValue` with format `F`.
 * At runtime it is a plain string.
 */
export type FormattedText<F extends ChartValueFormat = ChartValueFormat> =
  string & { readonly __format: F }

export function formatTextValue<F extends ChartValueFormat>(
  value: number | null | undefined,
  format: F,
  ops?: FormatOptions,
): FormattedText<F> | typeof MISSING_TEXT {
  if (value == null || !Number.isFinite(value)) return MISSING_TEXT

  const { prefixPositive, sigFigs = 0 } = ops ?? {}
  const fixed = value.toFixed(sigFigs)

  let formatted: string
  switch (format) {
    case 'count':
      formatted = String(Math.round(value))
      break
    case 'mb':
      formatted = `${fixed} MB`
      break
    case 'kb':
      formatted = `${fixed} KB`
      break
    case 's':
      formatted = `${fixed}s`
      break
    default:
      formatted = `${fixed} ms`
  }

  if (prefixPositive && value > 0) formatted = `+${formatted}`

  return formatted as FormattedText<F>
}

/** Display text for a missing or invalid value. */
export const MISSING_TEXT = '—'

/**
 * Runtime tag: keeps the raw number and format alongside the display text.
 * Stringifies (template literals, `String()`, JSON) to the display text.
 * `value` is `null` when the input was missing or invalid.
 */
export class FormattedValue<F extends ChartValueFormat = ChartValueFormat> {
  readonly value: number | null | undefined
  readonly format: F
  readonly text: FormattedText<F> | typeof MISSING_TEXT

  constructor(
    value: number | null | undefined,
    format: F,
    text: FormattedText<F> | typeof MISSING_TEXT,
  ) {
    this.value = value
    this.format = format
    this.text = text
  }

  toString(): string {
    return this.text
  }

  toJSON(): string {
    return this.text
  }
}

export function formatValue<F extends ChartValueFormat>(
  value: number | null | undefined,
  format: F,
  ops?: FormatOptions,
) {
  return new FormattedValue(value, format, formatTextValue(value, format, ops))
}

export type TimeUnit = Extract<ChartValueFormat, 'ms' | 's'>

/**
 * Compile-time tag: a string produced by `formatTextTime` with unit `U`.
 * A subtype of `FormattedText<U>`, so it can be used wherever that is expected.
 * At runtime it is a plain string.
 */
export type FormattedTimeText<U extends TimeUnit = TimeUnit> =
  FormattedText<U> & { readonly __time: true }

export interface TimeFormatOptions {
  sigFigs?: number
}

export function formatTextTime<U extends TimeUnit>(
  ms: number | null | undefined,
  unit: U,
  ops?: TimeFormatOptions,
): FormattedTimeText<U> | typeof MISSING_TEXT {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return MISSING_TEXT

  const { sigFigs = 0 } = ops ?? {}

  let formatted: string

  switch (unit) {
    case 's':
      formatted = `${(ms / 1000).toFixed(sigFigs)}s`
      break
    default:
      formatted = `${ms.toFixed(sigFigs)} ms`
  }

  return formatted as FormattedTimeText<U>
}

export class FormattedTime<
  U extends TimeUnit = TimeUnit,
> extends FormattedValue<U> {}

export function formatTime<U extends TimeUnit>(
  ms: number | null | undefined,
  unit: U,
  ops?: TimeFormatOptions,
) {
  const text = formatTextTime(ms, unit, ops)
  const value = text === MISSING_TEXT ? null : (ms as number)
  return new FormattedTime(value, unit, text)
}
