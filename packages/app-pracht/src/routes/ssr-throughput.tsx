import type { RouteComponentProps } from '@pracht/core'
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
          </tr>
        ))}
      </tbody>
    </table>
  )
}
