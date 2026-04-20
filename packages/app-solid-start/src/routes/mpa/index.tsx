import { For } from 'solid-js'
import { query, createAsync } from '@solidjs/router'
import { testData } from '../../../../testdata/src/ssr'

const getData = query(async () => {
  'use server'
  return await testData()
}, 'mpa-data')

export const route = {
  load: () => getData(),
}

export default function MpaPage() {
  const data = createAsync(() => getData())

  return (
    <table>
      <tbody>
        <For each={data()}>
          {(entry) => (
            <tr>
              <td>{entry.id}</td>
              <td>{entry.name}</td>
              <td>
                <a href={`/mpa/detail?id=${entry.id}`}>View →</a>
              </td>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  )
}
