import Route from '@ember/routing/route'

/**
 * The server renders an empty page, and the browser renders the table.
 */
export default class extends Route {
  model() {
    if (import.meta.env.SSR) return

    return Array.from({ length: 1000 }, () => ({
      id: crypto.randomUUID(),
      name: crypto.randomUUID(),
    }))
  }
}
