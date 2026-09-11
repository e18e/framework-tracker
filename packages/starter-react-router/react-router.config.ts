import type { Config } from '@react-router/dev/config'

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
  future: {
    v8_middleware: true,
    v8_splitRouteModules: true,
    v8_viteEnvironmentApi: true,
    // v8_passThroughRequests: true, // Supported from React Router 7.15
    // v8_trailingSlashAwareDataRequests: true, // Supported from React Router 7.16
  },
} satisfies Config
