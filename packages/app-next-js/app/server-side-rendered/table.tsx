'use client'
import Link from 'next/link'
import type { TableEntry } from '../../../testdata/src/ssr'

export function Table({ entries }: { entries: TableEntry[] }) {
  return (
    <table>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id}>
            <td>{entry.id}</td>
            <td>{entry.name}</td>
            <td>
              <Link href={`/server-side-rendered/${entry.id}`}>View →</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
