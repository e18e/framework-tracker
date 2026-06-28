import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  route('/client-side-rendered', 'routes/client-side-rendered.tsx'),
  route('/client-side-rendered/:id', 'routes/client-side-rendered.detail.tsx'),
  route('/server-side-rendered', 'routes/server-side-rendered.tsx'),
  route('/server-side-rendered/:id', 'routes/server-side-rendered.detail.tsx'),
] satisfies RouteConfig
