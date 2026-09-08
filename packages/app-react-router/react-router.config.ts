import type { Config } from '@react-router/dev/config'

export default {
  ssr: true,
  future: {
    v8_middleware: true,
    v8_splitRouteModules: true,
    v8_viteEnvironmentApi: true,
    // v8_passThroughRequests: true, // Supported from React Router 7.15
    // v8_trailingSlashAwareDataRequests: true, // Supported from React Router 7.16
  },
} satisfies Config
