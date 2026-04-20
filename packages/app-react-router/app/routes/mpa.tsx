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
              <a href={`/mpa/detail?id=${entry.id}`}>View →</a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
