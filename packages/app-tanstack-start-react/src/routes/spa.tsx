import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/spa')({
  component: SpaPage,
})

type Entry = { id: string; name: string }

function generateData(): Entry[] {
  return Array.from({ length: 1000 }, () => ({
    id: crypto.randomUUID(),
    name: crypto.randomUUID(),
  }))
}

function SpaPage() {
  const [entries] = useState(generateData)

  return (
    <table>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id}>
            <td>{entry.id}</td>
            <td>{entry.name}</td>
            <td>
              <Link to="/spa/detail" search={{ id: entry.id }}>
                View →
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
