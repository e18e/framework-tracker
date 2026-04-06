import { type RouteConfig, index, route } from '@react-router/dev/routes'

const isSpa = process.env.BUILD_MODE === 'spa'

export default [
  ...(isSpa ? [] : [index('routes/home.tsx')]),
  route('/spa', 'routes/spa.tsx'),
  route('/spa/detail', 'routes/spa.detail.tsx'),
] satisfies RouteConfig
