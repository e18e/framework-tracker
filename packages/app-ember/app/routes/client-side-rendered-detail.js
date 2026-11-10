import Route from '@ember/routing/route'

/**
 * The server renders an empty page, and the browser renders the detail.
 */
export default class extends Route {
  model(params) {
    if (import.meta.env.SSR) return

    return params.id
  }
}
