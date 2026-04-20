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
              <a href={`/mpa/detail?id=${entry.id}`}>View →</a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
