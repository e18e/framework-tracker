// @ts-check
import rootConfig from '../../eslint.config.js'
import astroPlugin from 'eslint-plugin-astro'

export default [
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/.astro/**'],
  },
  ...rootConfig,
  ...astroPlugin.configs.recommended,
  {
    rules: {
      // Add Astro-specific rule overrides here if needed
    },
  },
]
