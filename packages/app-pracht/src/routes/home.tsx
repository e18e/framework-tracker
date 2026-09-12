import { Link, type RouteComponentProps } from '@pracht/core'
import { testData } from '../../../testdata/src/ssr'

export async function loader() {
  const data = await testData()
  return { data }
}

export function Component({ data }: RouteComponentProps<typeof loader>) {
  return (
    <table>
      <tbody>
        {data.data.map((entry) => (
          <tr key={entry.id}>
            <td>{entry.id}</td>
            <td>{entry.name}</td>
            <td>
              <Link
                route="server-side-rendered-detail"
                params={{ id: entry.id }}
              >
                View →
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
