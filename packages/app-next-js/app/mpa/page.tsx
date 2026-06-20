import Link from 'next/link'
import { testData } from '../../../testdata/src/ssr'

export const dynamic = 'force-dynamic'

export default async function MpaPage() {
  const entries = await testData()

  return (
    <table>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id}>
            <td>{entry.id}</td>
            <td>{entry.name}</td>
            <td>
              <Link href={`/mpa/${entry.id}`}>View →</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
