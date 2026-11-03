import { defineConfig } from 'vite'
import { fileRoutes } from 'filesystem-routing/vite'
import solid from '@solidjs/vite-plugin'

export default defineConfig({
  plugins: [
    solid({
      start: { nodeServer: true },
      ssr: true,
      serverFunctions: true,
      extensions: ['.jsx', '.tsx'],
    }),
    fileRoutes({ types: true }),
  ],
})
