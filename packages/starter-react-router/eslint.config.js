// @ts-check
import rootConfig from '../../eslint.config.js'

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/build/**',
      '**/.react-router/**',
      '**/dist/**',
    ],
  },
  ...rootConfig,
  {
    rules: {
      // React Router commonly uses empty object patterns for unused route args
      'no-empty-pattern': 'off',
    },
  },
]
