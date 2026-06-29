import { testData } from '../../../testdata/src/ssr'
import type { Route } from './+types/ssr-throughput'

export async function loader() {
  const data = await testData()
  return { data }
}

export default function SSRThroughputPage({
  loaderData,
}: Route.ComponentProps) {
  return (
    <table>
      <tbody>
        {loaderData.data.map((entry) => (
          <tr key={entry.id}>
            <td>{entry.id}</td>
            <td>{entry.name}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
