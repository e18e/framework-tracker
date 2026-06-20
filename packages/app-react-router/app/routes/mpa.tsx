import { Link } from 'react-router'
import { testData } from '../../../testdata/src/ssr'
import type { Route } from './+types/mpa'

export async function loader() {
  const data = await testData()
  return { data }
}

export default function MpaPage({ loaderData }: Route.ComponentProps) {
  return (
    <table>
      <tbody>
        {loaderData.data.map((entry) => (
          <tr key={entry.id}>
            <td>{entry.id}</td>
            <td>{entry.name}</td>
            <td>
              <Link to={`/mpa/${entry.id}`}>View →</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
