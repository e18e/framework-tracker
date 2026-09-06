---
docs: https://tanstack.com/start/latest/docs/framework/react/guide/routing
---

The exported route object has to be named `Route`. The dev server regenerates
`src/routeTree.gen.ts` from the files in `src/routes`.

```tsx title="src/routes/about.tsx"
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({ component: About })

function About() {
  return <h1>About</h1>
}
```

```tsx title="src/routes/posts.$id.tsx"
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posts/$id')({ component: Post })

function Post() {
  const { id } = Route.useParams()

  return <p>Post {id}</p>
}
```
