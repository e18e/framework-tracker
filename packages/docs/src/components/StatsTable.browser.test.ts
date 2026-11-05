import { expect, test } from 'vitest'
import './StatsTable.astro?astro&type=style&index=0&lang.css'
import { expectNoAxeViolations, render } from './test/browser'

const visibleRows = (root: ParentNode) =>
  Array.from(root.querySelectorAll<HTMLTableRowElement>('tbody tr'))
    .filter((row) => row.offsetParent !== null)
    .map((row) => row.cells[0]!.textContent!.trim())

test('links each framework to its page unless it has no href', async () => {
  document.body.innerHTML = await render('statsTable')

  const links = Array.from(document.querySelectorAll('tbody a')).map((link) => [
    link.textContent,
    link.getAttribute('href'),
  ])
  expect(links).toEqual([
    ['Astro', '/framework/app-astro'],
    ['Next.js', '/framework/app-next-js'],
    ['Nuxt', '/framework/app-nuxt'],
    ['SvelteKit', '/framework/app-sveltekit'],
    ['Pracht', '/framework/app-pracht'],
  ])
  expect(visibleRows(document)).toContain('Baseline HTML')
})

test('leaves the cell empty when a value is missing', async () => {
  document.body.innerHTML = await render('statsTable')

  const pracht = Array.from(document.querySelectorAll('tbody tr')).find((row) =>
    row.textContent?.includes('Pracht'),
  ) as HTMLTableRowElement
  expect(pracht.cells[1]!.textContent).toBe('')
})

test('hides unfocused frameworks inside a focused scope', async () => {
  const html = await render('statsTable')
  document.body.innerHTML = `
    <div data-framework-scope="all">${html}</div>
    <div data-framework-scope="focused">${html}</div>`

  const scope = (name: string) =>
    document.querySelector(`[data-framework-scope="${name}"]`)!
  expect(visibleRows(scope('all'))).toHaveLength(6)
  expect(visibleRows(scope('focused'))).toEqual([
    'Astro',
    'Next.js',
    'Nuxt',
    'SvelteKit',
  ])
})

test('scrolls sideways when the table is wider than its container', async () => {
  document.body.innerHTML = `<div style="width: 120px">${await render('statsTable')}</div>`

  const wrapper = document.querySelector<HTMLElement>('.wrapper')!
  wrapper.scrollLeft = 50
  expect(wrapper.scrollLeft).toBeGreaterThan(0)
})

test('has no axe violations', async () => {
  document.body.innerHTML = await render('statsTable')

  await expectNoAxeViolations(document.querySelector('.wrapper')!)
})
