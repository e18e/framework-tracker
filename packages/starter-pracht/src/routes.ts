import { defineApp, route } from '@pracht/core'

export const app = defineApp({
  shells: {
    public: './shells/public.tsx',
  },
  routes: [
    route('/', './routes/home.tsx', {
      id: 'home',
      render: 'ssg',
      shell: 'public',
    }),
  ],
  // Rendered with a 404 status when nothing matches. Not a route: it never
  // matches a URL, so it cannot shadow static assets or later pages.
  notFound: {
    component: './routes/not-found.tsx',
    shell: 'public',
  },
  // Declarative invariants enforced by `pracht verify` — uncomment to use
  // (add the helpers to the @pracht/core import):
  // constraints: [
  //   requireHead("**"),
  // ],
})
