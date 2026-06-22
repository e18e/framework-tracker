import { For } from 'solid-js'
import { A } from '@solidjs/router'

export const ssr = false

type Entry = { id: string; name: string }

const entries: Entry[] = Array.from({ length: 1000 }, () => ({
  id: crypto.randomUUID(),
  name: crypto.randomUUID(),
}))

export default function ClientSideRenderedPage() {
  return (
    <table>
      <tbody>
        <For each={entries}>
          {(entry) => (
            <tr>
              <td>{entry.id}</td>
              <td>{entry.name}</td>
              <td>
                <A href={`/client-side-rendered/${entry.id}`}>View →</A>
              </td>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  )
}
