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

Most benchmarks run on Depot GitHub Actions runners using
[`depot-ubuntu-24.04`](https://depot.dev/docs/github-actions/runner-types),
with 2 CPUs, 8 GB RAM, 100 GB disk, and a 2 GB disk accelerator. Depot runs each
job on a fresh, single-tenant EC2 instance. Its x86 runners use AMD EC2
instances and GitHub's standard runner image. If a test deviates from this config it will list its setup in this doc.

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

#### SvelteKit

Installed using the CLI

- Step 1: `pnpm dlx sv create .`
- Step 2: Which template would you like?: `SvelteKit minimal`
- Step 3: Add type checking with TypeScript?: `Yes, using TypeScript syntax`
- Step 4: What would you like to add to your project?: `sveltekit-adapter`
- Step 5: Which SvelteKit adapter would you like to use?: `node`
- Step 6: Which package manager do you want to install dependencies with?: `pnpm`

#### SolidStart

Installed using the CLI. The SolidStart version selected in the generator
matches the framework version tracked by the starter project.

- Step 1: `pnpm create solid .`
- Step 2: What type of project would you like to create?: `SolidStart`
- Step 3: Which version of SolidStart?: `v1 (stable)`
- Step 4: Use Typescript?: `Yes`
- Step 5: Which template would you like to use?: `basic`
- Step 6: Install dependencies: `pnpm install`

### Dependency Counts

- Production and development dependency counts come from each starter package's
  `package.json`.
- Direct dependency counts are combined with e18e dependency analysis output
  when available, including duplicate dependency counts and install size.
- Dependency graph links point to npmgraph using the tracked starter package as
  the input package.

### Node Modules Size

- For every repetition, install benchmarks copy the starter package to a fresh
  temporary directory and use dedicated, initially empty pnpm store and cache
  directories. They run `pnpm install --frozen-lockfile` so every measurement
  installs the committed dependency graph without reusing local package data.
- `node_modules` size is measured after the regular install. This represents
  the starter's complete local installation, including development tools; it
  does not represent the framework's production deployment size.

### Build and Install Times

- Install time measures a clean `pnpm install --frozen-lockfile` in a fresh
  temporary copy of the starter package with an empty pnpm store and cache.
- Install benchmarks run 5 times by default and report average, minimum, and
  maximum duration.
- Each build repetition uses a fresh temporary copy of the tracked starter
  files. Dependencies are installed outside the timed region with a frozen
  lockfile and a dedicated store shared by the repetitions.
- Cold build time measures the first build in that fresh project. Warm build
  time measures a second build in the same project, preserving whatever cache
  or generated output the first build leaves in place.
- Build benchmarks run 5 times by default and report average, minimum, and
  maximum duration.
- Build output size is the total size of the configured production output
  directory after the final build run. For Next.js, `.next/cache` is excluded
  because it is not a production artifact. Other frameworks also write build
  caches, but store them under `node_modules`, outside their configured output
  directories. Those caches therefore still exist but are naturally excluded
  from the measurement; excluding `.next/cache` keeps the comparison
  consistent.

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

### Minimum Node Version

The oldest Node.js release that satisfies every `engines.node` range declared by the packages installed in the starter's `node_modules`, dev and prod dependencies included, together with the starter's own `package.json`. The ranges are deduplicated and intersected, so the floor is the lowest version that every package accepts at once. The "Set by" column lists the packages that impose that floor, meaning removing any one of them would lower it. When several packages share the floor and no single one is responsible, the column shows a dash.

A dash in the Min Node column means no installed package declares a resolvable `engines.node` range.

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

The client- and server-rendered browser tests benchmarks run directly on the Depot runner host and use the
host Chrome installation. They use headless Chrome with Lighthouse's desktop form factor, `throttlingMethod: provided`, and screen
emulation disabled. Lighthouse applies no simulated CPU or network throttling.
Requests use a local connection to a production server, so the results are
relative comparisons on the CI host rather than estimates for typical devices
or networks.

### Framework Specific Notes

- These runtime apps are not currently intended to measure static-site output. Astro's
  runtime benchmark app uses the Node adapter so the benchmark harness can serve
  on-demand routes in production; Astro's default static output is represented
  by the starter app measurements.

### Client Side Rendered Tests

- Each framework renders a table of 1000 rows with two UUID columns in the
  browser.
- First Paint and First Contentful Paint are measured during navigation to
  `/client-side-rendered`.
- The benchmark clicks the first row's detail link and measures the resulting
  interaction. Route IDs may be read from the URL or included in normal
  framework routing and bootstrap state, but the measured table and detail
  markup must be rendered in the browser.
- Full-document navigations use Lighthouse navigation mode. Client-routed
  navigations use timespan mode.
- Interaction latency is the sum of Lighthouse's input delay, processing
  duration, and presentation delay. It represents this controlled interaction,
  not the page-lifetime INP metric.
- Results are averaged across five production-build runs.
- These tests measure route-based client rendering, not forced SPA
  configurations. Each framework uses its supported production routing and
  rendering controls.
- Astro uses a client-only island for the measured content, which requires a UI
  framework integration. React was chosen because the Astro team identified it
  as their most popular integration, used by 23% of Astro projects (15/07/2026).
  The detail link performs a full-document navigation; the other tested
  frameworks use their client routers.

### Server Side Rendered Tests

- Each framework renders a table of 1000 rows with two UUID columns.
- Metrics are measured with Lighthouse flow in Chromium through Puppeteer.
- First Paint and First Contentful Paint are measured on initial navigation to
  `/server-side-rendered`.
- A controlled interaction clicks the first row's detail link and waits for
  `/server-side-rendered/:id`. Lighthouse's INP breakdown insight processes
  Chrome Event Timing trace data and reports its input delay, processing
  duration, and presentation delay. Their sum is recorded as the interaction
  latency.
- Interactions that trigger a full document navigation use Lighthouse
  navigation mode. Interactions handled by a client router use Lighthouse
  timespan mode.
- Detail links use each framework's default production navigation component or
  idiomatic anchor behavior. Default meta-framework route prefetching or
  preloading is allowed when it is part of the framework's default link
  behavior, but the measured SSR routes are still rendered on demand rather than
  converted to prerendered static output.
- Benchmarks run 5 times by default and require every Chrome paint and
  interaction measurement to be present and greater than zero.
- Astro keeps the default static output mode, but the measured
  `/server-side-rendered` route and its detail route use
  `export const prerender = false` so they are rendered on demand by the
  production server instead of measured as prerendered static HTML.
- Solid does not use its native `A` navigation element as it is being deprecated and only kept in currently as a convenience. Their docs have been updated to reflect this [GitHub PR](https://github.com/solidjs/solid-docs/pull/1620). Note update to docs page once this PR has been merged.

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

- The load test deviates from the standard Depot set up and uses: uses`depot-ubuntu-24.04-16`, with 16 CPUs, 64 GB RAM, 180 GB disk, and an 8 GB disk
  accelerator.
- Each framework serves the server-rendered table route over a real local HTTP
  server.
- The measured route is `/server-side-rendered`, using the same 1000-row UUID
  table as the SSR request throughput and browser rendering tests.
- This route keeps the same framework link components or idiomatic anchors used
  by the browser-rendered SSR test. The load test only makes HTTP requests to
  the table route; it does not run a browser or click detail links, so
  browser-only link prefetch behavior is not exercised during the load test.
- Load is applied with [autocannon](https://github.com/mcollina/autocannon) in
  staged connection counts: 1, 5, 10, 25, 50, 100, and 200 concurrent
  connections.
- The framework server and Autocannon run in separate containers on the same
  16-CPU Depot runner. The server container is pinned to CPUs 0-11 and the
  Autocannon container to CPUs 12-15, preventing the two benchmark workloads
  from competing for the same CPU cores. They still share the host's memory,
  kernel, Docker runtime, and other system resources, so this does not provide
  the full isolation of separate machines. Keeping both containers on one host
  also avoids introducing cross-machine network latency.
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
