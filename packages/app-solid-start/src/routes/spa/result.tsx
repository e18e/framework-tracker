export const ssr = false

import { For } from 'solid-js'

type Entry = { id: string; name: string }

function generateData(): Entry[] {
  return Array.from({ length: 1000 }, () => ({
    id: crypto.randomUUID(),
    name: crypto.randomUUID(),
  }))
}

export default function SpaResultPage() {
  const entries = generateData()

  return (
    <table>
      <tbody>
        <For each={entries}>
          {(entry) => (
            <tr>
              <td>{entry.id}</td>
              <td>{entry.name}</td>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  )
}
