import type { TableEntry } from '../../testdata/src/ssr.ts'

export function renderSSRThroughputHtml(entries: TableEntry[]): string {
  const rows = entries
    .map((entry) => `<tr><td>${entry.id}</td><td>${entry.name}</td></tr>`)
    .join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Baseline HTML SSR Throughput</title></head><body><table><tbody>${rows}</tbody></table></body></html>`
}

export function renderBaselineHtml(entries: TableEntry[]): string {
  const rows = entries
    .map(
      (entry) =>
        `<tr><td>${entry.id}</td><td>${entry.name}</td><td><a href="/server-side-rendered/${entry.id}">View →</a></td></tr>`,
    )
    .join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Baseline HTML</title></head><body><table><tbody>${rows}</tbody></table></body></html>`
}
