import { href, Link } from '@nifrajs/web-react/router'
import { useState } from 'react'
import type { Route } from './+types/client-side-rendered'

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

export const ssr = false

export default function ClientSideRendered(_props: Route.ComponentProps) {
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
                to={href({
                  to: '/client-side-rendered/:id',
                  params: { id: entry.id },
                })}
              >
                View -&gt;
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
