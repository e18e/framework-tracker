export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  future: {
    compatibilityVersion: 4,
  },
  nitro: {
    preset: 'node-server',
  },
  routeRules: {
    '/client-side-rendered': { ssr: false },
    '/client-side-rendered/**': { ssr: false },
  },
})
