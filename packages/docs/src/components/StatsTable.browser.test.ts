import { expect, test } from 'vitest'
import './StatsTable.astro?astro&type=style&index=0&lang.css'
import { expectNoAxeViolations, render } from './test/browser'

const tableContainer = () => document.querySelector('table')!.parentElement!

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
  expect(document.querySelector('tbody')!.textContent).toContain(
    'Baseline HTML',
  )
})

test('leaves the cell empty when a value is missing', async () => {
  document.body.innerHTML = await render('statsTable')

  const pracht = Array.from(document.querySelectorAll('tbody tr')).find((row) =>
    row.textContent?.includes('Pracht'),
  ) as HTMLTableRowElement
  expect(pracht.cells[1]!.textContent).toBe('')
})

test('scrolls sideways when the table is wider than its container', async () => {
  document.body.innerHTML = `<div style="width: 120px">${await render('statsTable')}</div>`

  const container = tableContainer()
  container.scrollLeft = 50
  expect(container.scrollLeft).toBeGreaterThan(0)
})

test('has no axe violations', async () => {
  document.body.innerHTML = await render('statsTable')

  await expectNoAxeViolations(tableContainer())
})
