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
