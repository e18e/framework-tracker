import { testData } from '../../testdata/src/ssr.ts'
import { html, htmlToResponse } from '@mastrojs/mastro'
import { Layout } from '../components/Layout.ts'

export const GET = async () => {
  const entries = await testData()
  return htmlToResponse(
    Layout({
      title: 'Test',
      children: html`
        <table>
          <tbody>
            ${entries.map(
              (entry) => html`
                <tr>
                  <td>${entry.id}</td>
                  <td>${entry.name}</td>
                  <td>
                    <a href="/server-side-rendered/${entry.id}">View →</a>
                  </td>
                </tr>
              `,
            )}
          </tbody>
        </table>
      `,
    }),
  )
}
