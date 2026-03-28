import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'

const isSpa = process.env.BUILD_MODE === 'spa'

export default defineConfig({
  plugins: [
    ...(isSpa ? [] : [nitro({ preset: 'node-middleware' })]),
    tanstackStart({ spa: { enabled: isSpa } }),
    viteReact(),
  ],
})
