import { Link, createFileRoute } from '@tanstack/react-router'
import { testData } from '../../../testdata/src/ssr'

export const Route = createFileRoute('/')({
  component: Home,
  loader: async () => await testData(),
})

function Home() {
  const data = Route.useLoaderData()

  return (
    <table>
      <tbody>
        {data.map((entry) => (
          <tr key={entry.id}>
            <td>{entry.id}</td>
            <td>{entry.name}</td>
            <td>
              <Link to="/server-side-rendered/$id" params={{ id: entry.id }}>
                View →
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
