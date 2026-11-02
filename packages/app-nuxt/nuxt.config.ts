export default defineNuxtConfig({
  compatibilityDate: 'latest',
  nitro: {
    compressPublicAssets: process.env.COMPRESS_PUBLIC_ASSETS === 'true',
    preset: './nitro-preset',
  },
  routeRules: {
    '/client-side-rendered': { ssr: false },
    '/client-side-rendered/**': { ssr: false },
  },
})
