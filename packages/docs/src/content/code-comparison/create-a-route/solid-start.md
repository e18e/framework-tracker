---
docs: https://docs.solidjs.com/solid-start/v2/building-your-application/routing
---

```tsx title="src/routes/about.tsx"
export default function About() {
  return <h1>About</h1>
}
```

```tsx title="src/routes/posts/[id].tsx"
import { useParams } from '@solidjs/router'

export default function Post() {
  const params = useParams()

  return <p>Post {params.id}</p>
}
```
