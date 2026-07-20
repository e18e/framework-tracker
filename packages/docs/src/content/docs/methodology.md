---
title: Methodology
description: How Framework Tracker benchmark metrics are collected.
---

Framework Tracker compares two kinds of projects. Dev Time stats come from
starter projects: each framework set up with its default starter-style
configuration. Run Time stats come from app packages: the same simple app
implemented across frameworks as consistently as each framework allows.

The goal is to show both the default project cost developers inherit when
starting a framework and the runtime cost of serving and hydrating a comparable
app. Timing results are run multiple times and averaged, and generated JSON is
published into the docs package.

Benchmarks run on Depot GitHub Actions runners using
[`depot-ubuntu-24.04`](https://depot.dev/docs/github-actions/runner-types),
which Depot documents as an Intel runner with 2 CPUs, 8 GB RAM, 100 GB disk,
and a 2 GB disk accelerator. Browser rendering benchmarks run directly on the
Depot runner host and use the host Chrome installation rather than a job-level
browser container. The generated runtime stats record the Chrome version used
for browser rendering benchmarks.

## Dev Time

Dev Time measurements use the repository's `starter-*` packages. These projects
represent each framework's default setup as closely as possible, so the stats
capture the dependency footprint, install cost, build cost, and generated output
of a typical new project.

### Project Setups

#### Astro

Installed using the CLI

- Step 1: `pnpm create astro@latest`
- Step 2: Where should we create your new project?: `.`
- Step 3: How would you like to start your new project?: `A basic, helpful starter project`
- Step 4: Install dependencies?: `yes`
- Step 5: Initialize a new git repository?: `No`

### Dependency Counts

- Production and development dependency counts come from each starter package's
  `package.json`.
- Direct dependency counts are combined with e18e dependency analysis output
  when available, including duplicate dependency counts and install size.
- Dependency graph links point to npmgraph using the tracked starter package as
  the input package.

### Node Modules Size

- Install benchmarks copy the starter package to a temporary directory, remove
  `node_modules`, prune the package manager store when possible, and run
  `pnpm install --no-frozen-lockfile`.
- Full `node_modules` size is measured after the regular install.
- Production-only `node_modules` size is measured after removing the full
  install and running `pnpm install --prod --no-frozen-lockfile`.

### Build and Install Times

- Install time measures a clean `pnpm install --no-frozen-lockfile` in a
  temporary copy of the starter package.
- Install benchmarks run 5 times by default and report average, minimum, and
  maximum duration.
- Cold build time removes the configured build output directory before running
  `pnpm build`.
- Warm build time runs `pnpm build` again after the cold build, preserving
  whatever cache or generated output the framework leaves in place.
- Build benchmarks run 5 times by default and report average, minimum, and
  maximum duration.
- Build output size is the total size of the configured production output
  directory after the final build run.

### Core-JS Polyfills

- The scanner searches JavaScript build output files for vendored
  [core-js](https://github.com/zloirock/core-js/blob/master/packages/core-js-compat/README.md)
  signatures.
- Detected core-js versions are compared with the modules required by the last 2
  major versions of Chrome, Firefox, Safari, and Edge.
- Unnecessary module counts represent polyfill modules already natively
  supported by that browser target.
- Size is approximate: it reflects the JavaScript chunk containing core-js,
  which may include other bundled code.

### Browser Baseline

- The scanner uses
  [baseline-detector](https://github.com/43081j/baseline-detector) to statically
  analyze JavaScript from each starter package's browser-facing production build
  output.
- The scan includes source-like files that baseline-detector supports from the
  production build output, including JavaScript, TypeScript, Vue, and Svelte
  files. Known server, cache, trace, type, and build-tool output is excluded.
- Baseline is baseline-detector's overall target result: `high`, `low`, or
  `limited`. When the result is not `high`, baseline-detector also reports the
  feature ID that determined it.
- Feature is the feature ID that determined a non-high Baseline result.
- Year is the Baseline year the project targets: the newest feature it relies
  on, or blank if any detected feature is not yet Baseline.
- Features is the number of unique web platform feature IDs detected in the
  browser-facing build output.

### Duplicate Dependencies

- Duplicate dependency details come from e18e dependency analysis messages
  collected for each starter package.
- All dependency counts come from the starter package's `pnpm-lock.yaml`
  `packages` entries, which include direct and transitive resolved package
  instances.
- A duplicate dependency means multiple installed versions of the same package
  were found in the starter's dependency tree.
- Framework detail pages show the package name, installed versions, and the
  dependency paths reported by the analyzer.

## Run Time

Run Time measurements use the repository's `app-*` packages. These apps
implement the same small benchmark routes and data shape wherever possible, so
the stats focus on browser rendering, server rendering, request-handler
throughput, and load behavior for comparable production apps.

### Framework Specific Notes

- These runtime apps are not currently intended to measure static-site output. Astro's
  runtime benchmark app uses the Node adapter so the benchmark harness can serve
  on-demand routes in production; Astro's default static output is represented
  by the starter app measurements.

### Client Side Rendered Tests

- Each framework renders a table of 1000 rows with two UUID columns.
- Metrics are measured with Lighthouse flow in Chromium through Puppeteer.
- First Paint and First Contentful Paint are measured on initial navigation to
  `/client-side-rendered`.
- Interaction to Next Paint is measured by clicking the first row's detail link
  and waiting for the detail view.
- Benchmarks run 5 times by default and average successful metrics.
- Client-side rendered tests use each framework's normal production build
  because SPA-only build modes are not supported consistently across the
  compared frameworks.
- Next.js wraps the client-side rendered table in a `dynamic` import with
  `ssr: false` to prevent build-time prerendering.
- TanStack Start, Nuxt, SvelteKit, and SolidStart disable SSR per route.
- React Router uses route-level `clientLoader` functions with `HydrateFallback`
  so the client-rendered routes are not server-rendered.
- Astro's benchmark table and detail components are React islands rendered with
  `client:only="react"`. Astro's `ClientRouter` is not used for this test
  because it changes navigation behavior rather than making components
  client-only. Using `client:only` is often considered an anti pattern in Astro but needed to make the tests fair and measure just client side performance.
- We also chose React for Astro as its the currently the most popular. 23% of projects according to the Astro team as of writing this (15/07/2026).

### Server Side Rendered Tests

- Each framework renders a table of 1000 rows with two UUID columns.
- Metrics are measured with Lighthouse flow in Chromium through Puppeteer.
- First Paint and First Contentful Paint are measured on initial navigation to
  `/server-side-rendered`.
- Interaction to Next Paint is measured by clicking the first row's detail link
  and waiting for `/server-side-rendered/:id`.
- Benchmarks run 5 times by default and average successful metrics.
- Astro keeps the default static output mode, but the measured
  `/server-side-rendered` route and its detail route use
  `export const prerender = false` so they are rendered on demand by the
  production server instead of measured as prerendered static HTML.

### Server Side Throughput Tests

- Each framework renders the dedicated `/ssr-throughput` route with a table of
  1000 rows and UUID id/name columns.
- This route intentionally omits detail links and framework link components so
  router, prefetch, and navigation metadata do not dominate the request handler
  throughput measurement.
- Mock HTTP requests bypass TCP overhead, so this measures request-handler
  rendering throughput rather than full network server throughput.
- Data is loaded asynchronously to simulate real-world data fetching.
- Duplication factor indicates how many times each UUID appears in the response.
  A 1x result is optimal; a 2x result usually means the response includes a
  hydration payload.
- Benchmarks run for 10 seconds using
  [tinybench](https://github.com/tinylibs/tinybench).
- Frameworks are invoked through their production request handlers where
  possible. Web API handlers receive `Request` objects; Node.js handlers receive
  mock `IncomingMessage` and `ServerResponse` objects.
- Next.js renders the throughput table as a client component, matching the setup
  from PR #94, so the benchmark compares traditional server-rendered React plus
  hydration work instead of forcing every table row through React Server
  Components.
- The test is inspired by
  [eknkc/ssr-benchmark](https://github.com/eknkc/ssr-benchmark).
- Astro's `/ssr-throughput` route uses `export const prerender = false` so this
  test measures request-time rendering rather than prerendered static HTML.

### Server Side Load Test

- Each framework serves the server-rendered table route over a real local HTTP
  server.
- The measured route is `/server-side-rendered`, using the same 1000-row UUID
  table as the SSR request throughput and browser rendering tests.
- Load is applied with [autocannon](https://github.com/mcollina/autocannon) in
  staged connection counts: 1, 5, 10, 25, 50, 100, and 200 concurrent
  connections.
- Each stage runs for approximately 5 seconds.
- Peak requests/sec is the highest successful stage throughput observed during
  the staged run.
- P90 and P99 latency are compared at the 25-, 50-, and 100-connection stages
  for every framework, so latency is measured under the same concurrency
  pressure.
- Total requests cover the full staged load run, not only the peak stage.

### Core Web Vitals

- Core Web Vital metrics are sourced from
  [HTTP Archive](https://httparchive.org/reports/techreport/tech) technology
  reports.
- The docs publish framework-level desktop and mobile percentages from the latest
  collected HTTP Archive snapshot in the repository.
- Metrics refresh monthly when new HTTP Archive data is collected.
