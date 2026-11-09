import { beforeAll, expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { SHARED_CHART_HEIGHT } from '../lib/chart'
import './ComparisonBarChart.astro?astro&type=style&index=0&lang.css'
import { expectNoAxeViolations, render } from './test/browser'

const chart = () =>
  document.querySelector<HTMLElement>('.comparison-chart-wrapper')!

const svgSize = () => {
  const box = chart().querySelector('svg.ts-chart')?.getBoundingClientRect()
  return box && { width: Math.round(box.width), height: Math.round(box.height) }
}

const drawnFrameworks = () =>
  Array.from(chart().querySelectorAll<HTMLElement>('.comparison-logo')).map(
    (logo) => logo.getAttribute('alt') ?? logo.title,
  )

// The chart script mounts every chart on the page once, when first imported.
beforeAll(async () => {
  await page.viewport(1200, 900)
  document.body.innerHTML = await render('barChart')
  await import('./ComparisonBarChart.astro?astro&type=script&index=0&lang.ts')
})

test('fills its container width at the fixed chart height', async () => {
  for (const width of [1200, 500]) {
    await page.viewport(width, 900)
    await expect
      .poll(svgSize)
      .toEqual({ width: chart().clientWidth, height: SHARED_CHART_HEIGHT })
  }
  await page.viewport(1200, 900)
})

test('draws every framework, smallest first', async () => {
  await expect
    .poll(drawnFrameworks)
    .toEqual([
      'Baseline HTML',
      'Pracht',
      'Astro',
      'SvelteKit',
      'Nuxt',
      'Next.js',
    ])
})

test('has no axe violations', async () => {
  await expect.poll(svgSize).toBeTruthy()

  await expectNoAxeViolations(chart().closest('.comparison-chart')!)
})
