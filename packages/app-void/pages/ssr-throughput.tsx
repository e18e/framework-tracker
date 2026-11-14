import type { Props } from './ssr-throughput.server'

export default function SSRThroughputPage({ data }: Props) {
  return (
    <table>
      <tbody>
        {data.map((entry) => (
          <tr key={entry.id}>
            <td>{entry.id}</td>
            <td>{entry.name}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
