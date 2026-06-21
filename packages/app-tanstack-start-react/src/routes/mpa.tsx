import { createFileRoute, Link } from '@tanstack/react-router'
import { testData } from '../../../testdata/src/ssr'

export const Route = createFileRoute('/mpa')({
  component: MpaPage,
  loader: async () => await testData(),
})

function MpaPage() {
  const data = Route.useLoaderData()

  return (
    <table>
      <tbody>
        {data.map((entry) => (
          <tr key={entry.id}>
            <td>{entry.id}</td>
            <td>{entry.name}</td>
            <td>
              <Link to="/mpa/$id" params={{ id: entry.id }}>
                View →
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
