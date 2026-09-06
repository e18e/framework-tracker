---
docs: https://mastrojs.github.io/docs/routing/
---

```ts title="routes/about.server.ts"
import { html, htmlToResponse } from '@mastrojs/mastro'

export const GET = () => htmlToResponse(html`<h1>About</h1>`)
```

```ts title="routes/posts/[id].server.ts"
import { getParams, html, htmlToResponse } from '@mastrojs/mastro'

export const GET = (request: Request) => {
  const { id } = getParams(request)

  return htmlToResponse(html`<p>Post ${id}</p>`)
}
```
