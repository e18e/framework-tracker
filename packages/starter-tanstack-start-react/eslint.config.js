// @ts-check
import rootConfig from '../../eslint.config.js'

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/.output/**',
      '**/dist/**',
      '**/.vinxi/**',
      '**/routeTree.gen.ts',
    ],
  },
  ...rootConfig,
  {
    rules: {
      // Add TanStack Start-specific rule overrides here if needed
    },
  },
]
