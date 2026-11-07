import Link from 'next/link'
import { getTestData } from '../../data'

export const instant = false

export default async function ServerSideRenderedPage() {
  const entries = await getTestData()

  return (
    <table>
      <tbody>
        {entries.map((entry) => (
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
