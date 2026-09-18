import { testData } from '../../../testdata/src/ssr'
import type { Route } from './+types/server-side-rendered-plain-links'

export async function loader() {
  const data = await testData()
  return { data }
}

export default function ServerSideRenderedPage({
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
              <a href={`/server-side-rendered/${entry.id}`}>View →</a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
