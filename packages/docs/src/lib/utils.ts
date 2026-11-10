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

/**
 * Formats a duration in milliseconds as seconds with two decimal places (e.g. "1.23s").
 * Callers should pass a finite, non-negative number; otherwise returns "—".
 */
export function formatTimeMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—'
  return `${(ms / 1000).toFixed(2)}s`
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
  value: number,
  format: F,
  ops?: FormatOptions,
): FormattedText<F> {
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
  return (
    prefixPositive && value > 0 ? `+${formatted}` : formatted
  ) as FormattedText<F>
}

/**
 * Runtime tag: keeps the raw number and format alongside the display text.
 * Stringifies (template literals, `String()`, JSON) to the display text.
 */
export class FormattedValue<F extends ChartValueFormat = ChartValueFormat> {
  readonly value: number
  readonly format: F
  readonly text: FormattedText<F>

  constructor(value: number, format: F, ops?: FormatOptions) {
    this.value = value
    this.format = format
    this.text = formatTextValue(value, format, ops)
  }

  toString(): string {
    return this.text
  }

  toJSON(): string {
    return this.text
  }
}

export function formatValue<F extends ChartValueFormat>(
  value: number,
  format: F,
  ops?: FormatOptions,
) {
  return new FormattedValue(value, format, ops)
}
