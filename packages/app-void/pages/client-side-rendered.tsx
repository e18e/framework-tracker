import { useState } from 'react'
import { Link } from '@void/react'

function generateData() {
  return Array.from({ length: 1000 }, () => ({
    id: crypto.randomUUID(),
    name: crypto.randomUUID(),
  }))
}

export default function ClientSideRenderedPage() {
  const [data] = useState(generateData)

  return (
    <table>
      <tbody>
        {data.map((entry) => (
          <tr key={entry.id}>
            <td>{entry.id}</td>
            <td>{entry.name}</td>
            <td>
              <Link href={`/client-side-rendered/${entry.id}`}>View →</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
