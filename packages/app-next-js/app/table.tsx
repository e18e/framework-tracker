'use client'
import type { TableEntry } from '../../testdata/src/ssr'

export function Table({ data }: { data: TableEntry[] }) {
  return (
    <table>
      <tbody>
        {data.map((entry) => (
          <tr key={entry.id}>
            <td>{entry.id}</td>
            <td>{entry.name}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
