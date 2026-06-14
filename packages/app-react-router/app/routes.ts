import { type RouteConfig, index, route } from '@react-router/dev/routes'

const isSpa = process.env.BUILD_MODE === 'spa'

export default [
  ...(isSpa ? [] : [index('routes/home.tsx')]),
  route('/spa', 'routes/spa.tsx'),
  route('/spa/:id', 'routes/spa.detail.tsx'),
  ...(isSpa
    ? []
    : [
        route('/mpa', 'routes/mpa.tsx'),
        route('/mpa/:id', 'routes/mpa.detail.tsx'),
      ]),
] satisfies RouteConfig
