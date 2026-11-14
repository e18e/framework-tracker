import { Link } from '@void/react'
import type { Props } from './server-side-rendered.server'

export default function ServerSideRenderedPage({ data }: Props) {
  return (
    <table>
      <tbody>
        {data.map((entry) => (
          <tr key={entry.id}>
            <td>{entry.id}</td>
            <td>{entry.name}</td>
            <td>
              <Link href={`/server-side-rendered/${entry.id}`}>View →</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
