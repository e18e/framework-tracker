import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/client-side-rendered')({
  component: ClientSideRenderedPage,
})

type Entry = { id: string; name: string }

function generateData(): Entry[] {
  return Array.from({ length: 1000 }, () => ({
    id: crypto.randomUUID(),
    name: crypto.randomUUID(),
  }))
}

function ClientSideRenderedPage() {
  const [entries] = useState(generateData)

  return (
    <table>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id}>
            <td>{entry.id}</td>
            <td>{entry.name}</td>
            <td>
              <Link to="/client-side-rendered/$id" params={{ id: entry.id }}>
                View →
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
