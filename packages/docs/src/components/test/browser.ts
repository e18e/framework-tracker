import axe from 'axe-core'
import { expect } from 'vitest'
import { commands } from 'vitest/browser'
import type { FixtureName } from './fixtures'
// Starlight's package exports hide its base styles, so they load by path.
import '../../../node_modules/@astrojs/starlight/dist/style/props.css'
import '../../../node_modules/@astrojs/starlight/dist/style/reset.css'
import '../../../node_modules/@astrojs/starlight/dist/style/util.css'
import '../../styles/starlight.css'

declare module 'vitest/browser' {
  interface BrowserCommands {
    renderFixture: (name: FixtureName) => Promise<string>
  }
}

export const render = (name: FixtureName) => commands.renderFixture(name)

export async function expectNoAxeViolations(element: Element) {
  const { violations } = await axe.run(element, {
    // `region` only makes sense for a whole page, not a single component.
    rules: { region: { enabled: false } },
  })
  expect(
    violations.map(({ id, nodes }) => `${id}: ${nodes[0]?.target.join(' ')}`),
  ).toEqual([])
}
