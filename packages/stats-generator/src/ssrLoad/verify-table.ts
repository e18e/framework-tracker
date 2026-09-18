import assert from 'node:assert/strict'

/** Verify the actual HTTP table, ignoring hydration comments and link attributes.
 * Component provenance is checked in route source: router Links also emit <a>.
 */
export function verifySSRLoadTable(html: string): void {
  const table = html.match(/<table\b[^>]*>([\s\S]*?)<\/table>/i)?.[1]
  assert.ok(table, 'Expected the SSR table in the HTTP response')
  const rows = [
    ...table
      .replace(/<!--[\s\S]*?-->/g, '')
      .matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi),
  ]
  assert.equal(rows.length, 1000, 'Expected 1,000 SSR rows')
  const ids = new Set<string>()
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  for (const [, row] of rows) {
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(
      (match) => match[1].trim(),
    )
    assert.equal(cells.length, 3, 'Expected id, name, and link columns')
    const [id, name, link] = cells
    assert.match(id, uuid)
    assert.match(name, uuid)
    ids.add(id)
    assert.equal([...link.matchAll(/<a\b/gi)].length, 1)
    assert.match(link, new RegExp(`href=["']/server-side-rendered/${id}["']`))
    assert.equal(
      link
        .replace(/<[^>]+>/g, '')
        .replace(/&rarr;|&#8594;|&#x2192;/gi, '→')
        .trim(),
      'View →',
    )
  }
  assert.equal(ids.size, 1000, 'Expected unique row ids')
}
