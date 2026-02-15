import { testData } from '../../../testdata/src/ssr'
import type { Route } from './+types/home'

export async function loader() {
  const data = await testData()
  return { data }
}

export default function Home({ loaderData }: Route.ComponentProps) {
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
