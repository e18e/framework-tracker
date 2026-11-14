import { defineConfig } from 'vite'
import { voidPlugin } from 'void'
import { voidReact } from '@void/react/plugin'

export default defineConfig({
  plugins: [voidPlugin(), voidReact({ react: { compiler: true } })],
})
