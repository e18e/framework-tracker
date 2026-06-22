import { useState } from 'react'

type Entry = { id: string; name: string }

function generateData(): Entry[] {
  return Array.from({ length: 1000 }, () => ({
    id: crypto.randomUUID(),
    name: crypto.randomUUID(),
  }))
}

export default function ClientSideRenderedPage() {
  const [entries] = useState(generateData)

  return (
    <table>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id}>
            <td>{entry.id}</td>
            <td>{entry.name}</td>
            <td>
              <a href={`/client-side-rendered/${entry.id}`}>View →</a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
