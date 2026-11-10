import { defineConfig } from 'vite'
import { ember } from '@nullvoxpopuli/ember-vite'
import { emberSsr } from 'vite-ember-ssr/vite-plugin'

export default defineConfig({
  plugins: [ember(), emberSsr()],
})
