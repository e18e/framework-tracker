import { defineConfig } from 'void/config'

export default defineConfig({
  target: 'node',
  routing: { typedRoutes: true },
  head: {
    htmlAttrs: { lang: 'en' },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    ],
  },
})
