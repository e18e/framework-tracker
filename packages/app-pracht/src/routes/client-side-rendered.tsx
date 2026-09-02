import { Link } from '@pracht/core'
import { useState } from 'preact/hooks'

interface Entry {
  id: string
  name: string
}

function generateData(): Entry[] {
  return Array.from({ length: 1000 }, () => ({
    id: crypto.randomUUID(),
    name: crypto.randomUUID(),
  }))
}

export function Component() {
  const [entries] = useState(generateData)

  return (
    <table>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id}>
            <td>{entry.id}</td>
            <td>{entry.name}</td>
            <td>
              <Link
                route="client-side-rendered-detail"
                params={{ id: entry.id }}
              >
                View →
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
