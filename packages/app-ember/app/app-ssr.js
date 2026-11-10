import App from '#app/app.js'
import config from '#config'
/**
 * The server waits for settled() before it reads the DOM,
 * so pending data, timers, and test waiters are part of the page.
 */
export { settled } from '@ember/test-helpers'
export function createSsrApp() {
  return App.create({ ...config.APP, autoboot: false })
}
