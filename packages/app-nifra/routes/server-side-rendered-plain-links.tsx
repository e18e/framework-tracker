import { href } from '@nifrajs/web-react/router'
import type { Route } from './+types/server-side-rendered-plain-links'

interface Entry {
  id: string
  name: string
}

export default function ServerSideRenderedPlainLinks({
  data,
}: Route.ComponentProps) {
  const entries = data.entries as Entry[]
  return (
    <table>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id}>
            <td>{entry.id}</td>
            <td>{entry.name}</td>
            <td>
              <a
                href={href({
                  to: '/server-side-rendered/:id',
                  params: { id: entry.id },
                })}
              >
                View -&gt;
              </a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
