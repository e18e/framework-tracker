import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  route('/spa', 'routes/spa.tsx'),
  route('/spa/result', 'routes/spa.result.tsx'),
] satisfies RouteConfig
