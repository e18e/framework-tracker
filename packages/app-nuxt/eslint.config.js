// @ts-check
import rootConfig from '../../eslint.config.js'

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/.nuxt/**',
      '**/.output/**',
      '**/dist/**',
    ],
  },
  ...rootConfig,
]
