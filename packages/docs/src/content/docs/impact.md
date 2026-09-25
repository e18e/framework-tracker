---
title: Impact
description: Improvements to frameworks, routers, and documentation that came out of Framework Tracker.
---

The Framework Tracker project measures frameworks, but the comparisons also surface
concrete improvement opportunities in the frameworks themselves, their
dependencies, and their documentation. This page collects upstream changes that
came out of the project or were influenced by its output.

## Fewer TanStack Router link hydration updates

- [perf(react-router): avoid redundant link hydration updates](https://github.com/TanStack/router/pull/8435)
  avoids one hydration-triggered render per ordinary React Router link by only
  subscribing links to hydration state when their active matching compares URL
  hashes. Hash-sensitive links keep the update they need. Found while
  investigating Framework Tracker's 1,000-link table and proposed upstream to
  TanStack Router.

## Faster link rendering in Nuxt and Vue4

- [perf(nuxt): render internal `<NuxtLink>` anchors directly on server](https://github.com/nuxt/nuxt/pull/36015)
  renders internal `<NuxtLink>` anchors directly on the server instead of
  building reactive link state, cutting server render time for internal
  links by roughly 58%. Merged into Nuxt.
- [perf(link): skip reactivity when rendering on the server](https://github.com/vuejs/router/pull/2774)
  skips Vue reactivity when rendering `<RouterLink>` during SSR, making
  server-rendered links roughly 1.5-2.2x faster. Proposed upstream to Vue
  Router.

## Faster Next.js rendering

- [[Server Components] Walk parsed JSON instead of using reviver for parsing RSC payload](https://github.com/react/react/pull/35776)
  replaces the `JSON.parse` reviver used to deserialize React Server
  Components payloads with a plain parse followed by a JavaScript walk,
  making RSC payload parsing around 75% faster and speeding up rendering in
  frameworks built on top of it, including Next.js. Merged into React.

## Clearer Solid Router documentation

- [docs: note future A component deprecation](https://github.com/solidjs/solid-docs/pull/1620)
  updates the Solid Router docs to note that the `<A>` component will be
  deprecated in favor of native anchors, steering developers toward better
  practices. Merged into the Solid docs.
