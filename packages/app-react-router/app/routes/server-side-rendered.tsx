import { Link } from 'react-router'
import { testData } from '../../../testdata/src/ssr'
import type { Route } from './+types/server-side-rendered'

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
              <Link to={`/server-side-rendered/${entry.id}`}>View →</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
