import { Link } from 'react-router'
import type { Route } from './+types/client-side-rendered'

type Entry = { id: string; name: string }

function generateData(): Entry[] {
  return Array.from({ length: 1000 }, () => ({
    id: crypto.randomUUID(),
    name: crypto.randomUUID(),
  }))
}

export async function clientLoader() {
  return { data: generateData() }
}

clientLoader.hydrate = true as const

export function HydrateFallback() {
  return null
}

export default function ClientSideRenderedPage({
  loaderData,
}: Route.ComponentProps) {
  return (
    <table>
      <tbody>
        {loaderData.data.map((entry) => (
          <tr key={entry.id}>
            <td>{entry.id}</td>
            <td>{entry.name}</td>
            <td>
              <Link to={`/client-side-rendered/${entry.id}`}>View →</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
