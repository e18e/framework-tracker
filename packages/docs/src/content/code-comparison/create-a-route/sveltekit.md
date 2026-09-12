---
docs: https://svelte.dev/docs/kit/routing
---

```svelte title="src/routes/about/+page.svelte"
<h1>About</h1>
```

```svelte title="src/routes/posts/[id]/+page.svelte"
<script lang="ts">
  import type { PageProps } from './$types'

  let { params }: PageProps = $props()
</script>

<p>Post {params.id}</p>
```
