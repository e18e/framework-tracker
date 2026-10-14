import { Suspense } from 'react'
import Link from 'next/link'
import { getTestData } from '../../data'

export default function ServerSideRenderedPage() {
  return (
    <Suspense fallback={null}>
      <RequestTable />
    </Suspense>
  )
}

async function RequestTable() {
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
