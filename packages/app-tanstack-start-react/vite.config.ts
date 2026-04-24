import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

const isSpa = process.env.BUILD_MODE === 'spa'

export default defineConfig({
  preview: {
    host: '127.0.0.1',
  },
  plugins: [
    ...(isSpa ? [] : [nitro({ preset: 'node-middleware' })]),
    tanstackStart({ spa: { enabled: isSpa, maskPath: '/spa' } }),
    viteReact(),
  ],
})
