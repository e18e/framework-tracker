---
title: Impact
description: Improvements to frameworks, routers, and documentation that came out of Framework Tracker.
---

The Framework Tracker project measures frameworks, but the comparisons also surface
concrete improvement opportunities in the frameworks themselves, their
dependencies, and their documentation. This page collects upstream changes that
came out of the project or were influenced by its output.

## TanStack

- [perf(react-router): avoid redundant link hydration updates](https://github.com/TanStack/router/pull/8435)
  avoids one hydration-triggered render per ordinary React Router link by only
  subscribing links to hydration state when their active matching compares URL
  hashes. Hash-sensitive links keep the update they need. Found while
  investigating Framework Tracker's 1,000-link table and proposed upstream to
  TanStack Router.

## Nuxt

- [perf(nuxt): render internal `<NuxtLink>` anchors directly on server](https://github.com/nuxt/nuxt/pull/36015)
  renders internal `<NuxtLink>` anchors directly on the server instead of
  building reactive link state, cutting server render time for internal
  links by roughly 58%. Merged into Nuxt.

- [perf(link): skip reactivity when rendering on the server](https://github.com/vuejs/router/pull/2774)
  skips Vue reactivity when rendering `<RouterLink>` during SSR, making
  server-rendered links roughly 1.5-2.2x faster. Proposed upstream to Vue
  Router.

## Next.js

- [[Server Components] Walk parsed JSON instead of using reviver for parsing RSC payload](https://github.com/react/react/pull/35776)
  replaces the `JSON.parse` reviver used to deserialize React Server
  Components payloads with a plain parse followed by a JavaScript walk,
  making RSC payload parsing around 75% faster and speeding up rendering in
  frameworks built on top of it, including Next.js. Merged into React.

## Solid

- [perf(claims): skip URL parsing for plain hrefs in SSR link claims](https://github.com/solidjs/solid-router/pull/701)
  reads the path and query of plain root-relative hrefs without `new URL`
  when Solid Router renders links on the server. That removes two URL
  parses per link and takes the 1,000-link table from 283 to 385 requests
  per second. Merged into Solid Router and released in `2.0.0-next.43`.
- [perf(compiler): write non-ASCII SSR template text as character references](https://github.com/solidjs/solid/pull/4331)
  makes the Solid compiler write characters such as the `→` in "View →" as
  character references in server templates. One such character made V8
  store the whole rendered page as a two-byte string, which roughly doubled
  the cost of encoding the response. Rendering and encoding a 1,000-row
  table is about 1.5x faster. Merged into Solid and released in
  `2.0.0-rc.20`.
- [perf(web): build direct-call carrier shells only when a value is bound](https://github.com/solidjs/solid/pull/4333)
  stops Solid from copying every object in a server function's result when
  the function is called during server rendering and nothing in the result
  needs binding to the request. Handling a 1,000-row result goes from 0.91
  to 0.56 ms. Merged into Solid and released in `2.0.0-rc.20`.

All three were found while adding Solid 2.0 to Framework Tracker
([#709](https://github.com/e18e/framework-tracker/pull/709)). On its CI
runner, the Solid 2.0 app's SSR load test went from 170 to 280 requests per
second with one connection and from about 200 to about 390 under
concurrency after upgrading to these releases.

## SolidStart

- [docs: note future A component deprecation](https://github.com/solidjs/solid-docs/pull/1620)
  updates the Solid Router docs to note that the `<A>` component will be
  deprecated in favor of native anchors, steering developers toward better
  practices. Merged into the Solid docs.
