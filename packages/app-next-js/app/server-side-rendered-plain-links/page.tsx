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
              <a href={`/server-side-rendered/${entry.id}`}>View →</a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
