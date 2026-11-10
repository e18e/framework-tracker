import { Router } from '@lit-labs/router'
import { html, LitElement } from 'lit'

export class AppRoot extends LitElement {
  private router = new Router(this, [
    {
      path: '/client-side-rendered',
      enter: async () => {
        await import('./client-side-rendered-table.ts')
        return true
      },
      render: () =>
        html`<client-side-rendered-table></client-side-rendered-table>`,
    },
    {
      path: '/client-side-rendered/:id',
      render: ({ id }) => html`<p id="detail-id">${id}</p>`,
    },
    {
      path: '/initial-load',
      enter: async () => {
        await import('./initial-load.ts')
        return true
      },
      render: () => html`<initial-load-page></initial-load-page>`,
    },
  ])

  // Render into the light DOM so the page content is styled by the document.
  protected override createRenderRoot() {
    return this
  }

  protected override render() {
    return this.router.outlet()
  }
}

customElements.define('app-root', AppRoot)
