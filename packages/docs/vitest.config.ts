import { getViteConfig } from 'astro/config'
import { playwright } from '@vitest/browser-playwright'
import type { BrowserCommand } from 'vitest/node'
import type { FixtureName } from './src/components/test/fixtures'

// `.astro` files have to be rendered by the Node-side Vite server; importing
// them in the browser would run their client scripts during render.
const renderFixture: BrowserCommand<[name: FixtureName]> = async (
  ctx,
  name,
) => {
  const { renderFixture } = (await ctx.project.vite.ssrLoadModule(
    '/src/components/test/fixtures.ts',
  )) as typeof import('./src/components/test/fixtures')
  return renderFixture(name)
}

export default getViteConfig({
  // Pre-bundled so Vite does not reload the page mid-run when a chart script
  // first imports them.
  optimizeDeps: {
    include: [
      'axe-core',
      '@tanstack/charts',
      '@tanstack/charts/scales/band',
      '@tanstack/charts/scales/linear',
      '@tanstack/charts/mark/decorative',
      '@tanstack/charts/tooltip',
    ],
  },
  test: {
    include: ['src/**/*.browser.test.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
      commands: { renderFixture },
    },
  },
})
