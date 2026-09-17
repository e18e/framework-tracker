export default defineNuxtConfig({
  compatibilityDate: 'latest',
  nitro: {
    preset: './nitro-preset',
  },
  routeRules: {
    '/client-side-rendered': { ssr: false },
    '/client-side-rendered/**': { ssr: false },
  },
})
