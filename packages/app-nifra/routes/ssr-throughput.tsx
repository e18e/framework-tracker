import type { Route } from './+types/ssr-throughput'

interface Entry {
  id: string
  name: string
}

export default function SSRThroughput({ data }: Route.ComponentProps) {
  const entries = data.entries as Entry[]
  return (
    <table>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id}>
            <td>{entry.id}</td>
            <td>{entry.name}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
