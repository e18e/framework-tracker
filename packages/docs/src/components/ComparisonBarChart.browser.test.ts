import { beforeAll, expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { COMPARISON_CHART_HEIGHT } from '../lib/chart'
import './ComparisonBarChart.astro?astro&type=style&index=0&lang.css'
import { expectNoAxeViolations, render } from './test/browser'

const chart = (scope: 'all' | 'focused') =>
  document.querySelector<HTMLElement>(
    `[data-framework-scope="${scope}"] .comparison-chart-wrapper`,
  )!

const svgSize = (scope: 'all' | 'focused') => {
  const box = chart(scope)
    .querySelector('svg.ts-chart')
    ?.getBoundingClientRect()
  return box && { width: Math.round(box.width), height: Math.round(box.height) }
}

const drawnFrameworks = (scope: 'all' | 'focused') =>
  Array.from(
    chart(scope).querySelectorAll<HTMLElement>('.comparison-logo'),
  ).map((logo) => logo.getAttribute('alt') ?? logo.title)

// The chart script mounts every chart on the page once, when first imported.
beforeAll(async () => {
  await page.viewport(1200, 900)
  const html = await render('barChart')
  document.body.innerHTML = `
    <div data-framework-scope="all">${html}</div>
    <div data-framework-scope="focused">${html}</div>`
  await import('./ComparisonBarChart.astro?astro&type=script&index=0&lang.ts')
})

test('fills its container width at the fixed chart height', async () => {
  for (const width of [1200, 500]) {
    await page.viewport(width, 900)
    await expect
      .poll(() => svgSize('all'))
      .toEqual({
        width: chart('all').clientWidth,
        height: COMPARISON_CHART_HEIGHT,
      })
  }
  await page.viewport(1200, 900)
})

test('draws every framework, smallest first', async () => {
  await expect
    .poll(() => drawnFrameworks('all'))
    .toEqual([
      'Baseline HTML',
      'Pracht',
      'Astro',
      'SvelteKit',
      'Nuxt',
      'Next.js',
    ])
})

test('draws only focused frameworks inside a focused scope', async () => {
  await expect
    .poll(() => drawnFrameworks('focused'))
    .toEqual(['Baseline HTML', 'Astro', 'SvelteKit', 'Nuxt', 'Next.js'])
})

test('has no axe violations', async () => {
  await expect.poll(() => svgSize('all')).toBeTruthy()

  await expectNoAxeViolations(chart('all').closest('.comparison-chart')!)
})
