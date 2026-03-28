export const ssr = false

import { For } from 'solid-js'
import { A } from '@solidjs/router'

type Entry = { id: string; name: string }

function generateData(): Entry[] {
  return Array.from({ length: 1000 }, () => ({
    id: crypto.randomUUID(),
    name: crypto.randomUUID(),
  }))
}

export default function SpaPage() {
  const entries = generateData()

  return (
    <table>
      <tbody>
        <For each={entries}>
          {(entry) => (
            <tr>
              <td>{entry.id}</td>
              <td>{entry.name}</td>
              <td>
                <A href={`/spa/detail?id=${entry.id}`}>View →</A>
              </td>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  )
}
