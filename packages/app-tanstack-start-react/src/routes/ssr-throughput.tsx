import { createFileRoute } from '@tanstack/react-router'
import { testData } from '../../../testdata/src/ssr'

export const Route = createFileRoute('/ssr-throughput')({
  component: SSRThroughputPage,
  loader: async () => await testData(),
})

function SSRThroughputPage() {
  const data = Route.useLoaderData()

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
