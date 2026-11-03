import { For } from 'solid-js'

type Entry = { id: string; name: string }

const entries: Entry[] = Array.from({ length: 1000 }, () => ({
  id: crypto.randomUUID(),
  name: crypto.randomUUID(),
}))

export default function ClientSideRenderedTable() {
  return (
    <table>
      <tbody>
        <For each={entries}>
          {(entry) => (
            <tr>
              <td>{entry.id}</td>
              <td>{entry.name}</td>
              <td>
                <a href={`/client-side-rendered/${entry.id}`}>View →</a>
              </td>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  )
}
