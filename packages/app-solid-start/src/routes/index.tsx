import { For } from 'solid-js'
import { query, createAsync } from '@solidjs/router'
import { testData } from '@framework-tracker/testdata'

const getData = query(async () => {
  'use server'
  return await testData()
}, 'test-data')

export const route = {
  load: () => getData(),
}

export default function Home() {
  const data = createAsync(() => getData())

  return (
    <table>
      <tbody>
        <For each={data()}>
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
