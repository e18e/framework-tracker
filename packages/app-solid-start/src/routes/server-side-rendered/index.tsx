import { For } from 'solid-js'
import { A, query, createAsync } from '@solidjs/router'
import { testData } from '../../../../testdata/src/ssr'

const getData = query(async () => {
  'use server'
  return await testData()
}, 'server-side-rendered-data')

export const route = {
  load: () => getData(),
}

export default function ServerSideRenderedPage() {
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
                <A href={`/server-side-rendered/${entry.id}`}>View →</A>
              </td>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  )
}
