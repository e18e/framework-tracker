import { createFileRoute } from '@tanstack/react-router'
import { getTestData } from '../data/test-data'
import type { TableEntry } from '../../../testdata/src/ssr'

export const Route = createFileRoute('/ssr-throughput')({
  component: SSRThroughputPage,
  loader: () => getTestData(),
})

function SSRThroughputPage() {
  const data: TableEntry[] = Route.useLoaderData()

  return (
    <table>
      <tbody>
        {data.map((entry) => (
          <tr key={entry.id}>
            <td>{entry.id}</td>
            <td>{entry.name}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
