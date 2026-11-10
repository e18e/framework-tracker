import { html, LitElement } from 'lit'

interface Entry {
  id: string
  name: string
}

const entries: Entry[] = Array.from({ length: 1000 }, () => ({
  id: crypto.randomUUID(),
  name: crypto.randomUUID(),
}))

export class ClientSideRenderedTable extends LitElement {
  protected override createRenderRoot() {
    return this
  }

  protected override render() {
    return html`
      <table>
        <tbody>
          ${entries.map(
            (entry) => html`
              <tr>
                <td>${entry.id}</td>
                <td>${entry.name}</td>
                <td>
                  <a href="/client-side-rendered/${entry.id}">View →</a>
                </td>
              </tr>
            `,
          )}
        </tbody>
      </table>
    `
  }
}

customElements.define('client-side-rendered-table', ClientSideRenderedTable)
