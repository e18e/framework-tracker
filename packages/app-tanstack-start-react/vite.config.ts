import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

const isClientSideRendered = process.env.BUILD_MODE === 'spa'

export default defineConfig({
  preview: {
    host: '127.0.0.1',
  },
  plugins: [
    ...(isClientSideRendered ? [] : [nitro({ preset: 'node-middleware' })]),
    tanstackStart({ spa: { enabled: isClientSideRendered } }),
    viteReact(),
  ],
})
