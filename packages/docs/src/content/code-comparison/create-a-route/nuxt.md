---
docs: https://nuxt.com/docs/getting-started/routing
---

The starter has no `pages/` directory and renders `app.vue` directly. Adding one turns the router on, so `app.vue` has to hand over to `<NuxtPage />` and `/` needs its own `app/pages/index.vue` from then on.

```vue title="app/app.vue"
<template>
  <NuxtPage />
</template>
```

```vue title="app/pages/about.vue"
<template>
  <h1>About</h1>
</template>
```

```vue title="app/pages/posts/[id].vue"
<script setup lang="ts">
const route = useRoute()
</script>

<template>
  <p>Post {{ route.params.id }}</p>
</template>
```
