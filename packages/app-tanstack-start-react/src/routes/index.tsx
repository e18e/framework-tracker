import { Link, createFileRoute } from '@tanstack/react-router'
import { getTestData } from '../data/test-data'

export const Route = createFileRoute('/')({
  component: Home,
  loader: () => getTestData(),
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
