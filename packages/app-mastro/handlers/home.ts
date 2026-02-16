import { testData } from '../../testdata/src/ssr.ts'
import { html, htmlToResponse } from '@mastrojs/mastro'
import { Layout } from '../components/Layout.ts'

const entries = await testData()

export const GET = () =>
  htmlToResponse(
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
                </tr>
              `,
            )}
          </tbody>
        </table>
      `,
    }),
  )
