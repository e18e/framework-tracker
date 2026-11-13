import { href, Link } from '@nifrajs/web-react/router'
import type { Route } from './+types/server-side-rendered'

interface Entry {
  id: string
  name: string
}

export default function ServerSideRendered({ data }: Route.ComponentProps) {
  const entries = data.entries as Entry[]
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
                  to: '/server-side-rendered/:id',
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
