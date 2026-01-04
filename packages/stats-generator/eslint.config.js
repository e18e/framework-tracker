// @ts-check
import js from '@eslint/js'

export default [
  {
    ignores: ['node_modules/**', 'dist/**'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
]
