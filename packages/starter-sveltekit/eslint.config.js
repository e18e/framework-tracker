// @ts-check
import rootConfig from '../../eslint.config.js'

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/.svelte-kit/**',
      '**/build/**',
      '**/dist/**',
    ],
  },
  ...rootConfig,
]
