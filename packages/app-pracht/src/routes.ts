import { defineApp, route } from '@pracht/core'

export const app = defineApp({
  routes: [
    route('/', './routes/home.tsx', { id: 'home', render: 'ssr' }),
    route('/server-side-rendered', './routes/server-side-rendered.tsx', {
      id: 'server-side-rendered',
      render: 'ssr',
    }),
    route(
      '/server-side-rendered/:id',
      './routes/server-side-rendered-detail.tsx',
      {
        id: 'server-side-rendered-detail',
        render: 'ssr',
      },
    ),
    route('/client-side-rendered', './routes/client-side-rendered.tsx', {
      id: 'client-side-rendered',
      render: 'spa',
    }),
    route(
      '/client-side-rendered/:id',
      './routes/client-side-rendered-detail.tsx',
      {
        id: 'client-side-rendered-detail',
        render: 'spa',
      },
    ),
    route('/ssr-throughput', './routes/ssr-throughput.tsx', {
      id: 'ssr-throughput',
      render: 'ssr',
    }),
  ],
})
