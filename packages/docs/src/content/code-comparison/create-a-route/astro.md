---
docs: https://docs.astro.build/en/guides/routing/
---

The starter builds static output, so a dynamic route has to enumerate the pages to build. Adding `export const prerender = false` switches the route to per-request rendering instead, which then needs an adapter to build and deploy.

```astro title="src/pages/about.astro"
<h1>About</h1>
```

```astro title="src/pages/posts/[id].astro"
---
export function getStaticPaths() {
  return [{ params: { id: '1' } }]
}

const { id } = Astro.params
---

<p>Post {id}</p>
```
