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
app. Repetition and aggregation vary by benchmark, as described in each
benchmark section. Generated JSON is published into the docs package.

## Default Benchmark Setup

The following setup applies to the repository's benchmarks unless a test section
states otherwise. Framework-specific choices are described in Project Setups
and Framework Specific Notes; additional requirements or differences are listed
with the affected test.

Benchmarks run on Depot GitHub Actions runners using
[`depot-ubuntu-24.04`](https://depot.dev/docs/github-actions/runner-types),
with 2 CPUs, 8 GB RAM, 100 GB disk, and a 2 GB disk accelerator. Depot runs each
job on a fresh, single-tenant EC2 instance. Its x86 runners use AMD EC2
instances and GitHub's standard runner image.

- **Node.js:** CI uses Node 24. This is the benchmark runtime, separate from the
  minimum supported Node version reported for each framework.
- **Package manager and dependencies:** CI uses the pnpm version declared in the
  root `package.json` and installs dependencies with frozen lockfiles.
- **Framework, adapter, and build tool:** Each project uses the configuration
  committed in its `starter-*` or `app-*` package. Its `package.json`, lockfile,
  and framework configuration identify the UI library, adapter, build tool, and
  dependency versions. These choices can differ between frameworks.
- **Browser tests:** Client- and server-rendered browser tests run directly on
  the runner host using its Chrome installation in headless mode. Lighthouse
  uses the desktop form factor, `throttlingMethod: provided`, and no screen
  emulation or simulated CPU or network throttling. Requests use a local
  connection to a production server.
- **Recorded environment:** Results include runner details and the measured
  framework version; browser results also include the Chrome version used.
  Node 24 and the host Chrome installation can receive updates between runs.

The browser results are relative comparisons on the CI host rather than
estimates for typical devices or networks. The SSR load tests document their
larger runner and container setup below. Core Web Vitals use external HTTP
Archive data, as described in that section.

### Framework Build Tools and Adapters

These are the current repository configurations. The build tool applies to both
the Dev Time starter and Run Time app unless noted. The adapter/server column
describes the Run Time app; starter differences are listed below.

| Framework      | UI library                           | Bundler / build tool         | Adapter / server    |
| -------------- | ------------------------------------ | ---------------------------- | ------------------- |
| Astro          | Astro; React for client-only content | Vite (via Astro)             | Node adapter        |
| Next.js        | React                                | Turbopack (via `next build`) | Next.js server      |
| Nuxt           | Vue                                  | Vite (via Nuxt)              | Nitro               |
| React Router   | React                                | Vite                         | React Router server |
| SolidStart     | Solid                                | Vite                         | Nitro               |
| SvelteKit      | Svelte                               | Vite                         | Node adapter        |
| TanStack Start | React                                | Vite                         | Nitro               |
| Baseline HTML  | None                                 | No build step                | Node.js             |

- Astro's runtime app uses its Node adapter in standalone mode; its starter
  builds static output without an adapter or React integration.
- The SolidStart and TanStack Start starters use `nitro()` without an explicit
  preset; their runtime apps explicitly select `node-server`.
- The TanStack Start runtime app uses the [documented FastResponse optimization](https://tanstack.com/start/latest/docs/framework/react/guide/hosting#performance-tip-fastresponse)
  for Node.js deployments with Nitro. Its server entry replaces the global
  `Response` constructor with srvx's `FastResponse`. This is a deployment-specific
  throughput setting; the Dev Time starter retains its generated setup.
- Nuxt's starter uses its default Nitro configuration. Its runtime app extends
  `node-server` with an entry that also exposes a fetch handler for the
  request-throughput benchmark.
- Baseline HTML is a runtime-only comparison.
- Exact dependency versions are recorded in each project's `package.json` and
  lockfile.
- Test-specific rendering and routing choices are described in the relevant
  benchmark sections below.

## Dev Time

Dev Time measurements use the repository's `starter-*` packages. These projects
represent each framework's default setup as closely as possible, so the stats
capture the dependency footprint, install cost, build cost, and generated output
of a typical new project.

### Package Versions

Current pinned dependencies are listed in each project's `package.json`:

- [Astro](https://github.com/e18e/framework-tracker/blob/main/packages/starter-astro/package.json)
- [Next.js](https://github.com/e18e/framework-tracker/blob/main/packages/starter-next-js/package.json)
- [Nuxt](https://github.com/e18e/framework-tracker/blob/main/packages/starter-nuxt/package.json)
- [React Router](https://github.com/e18e/framework-tracker/blob/main/packages/starter-react-router/package.json)
- [SolidStart](https://github.com/e18e/framework-tracker/blob/main/packages/starter-solid-start/package.json)
- [SvelteKit](https://github.com/e18e/framework-tracker/blob/main/packages/starter-sveltekit/package.json)
- [TanStack Start (React)](https://github.com/e18e/framework-tracker/blob/main/packages/starter-tanstack-start-react/package.json)

### Project Setups

#### Astro

Installed using the CLI

- Step 1: `pnpm create astro@latest`
- Step 2: Where should we create your new project?: `.`
- Step 3: How would you like to start your new project?: `A basic, helpful starter project`
- Step 4: Install dependencies?: `yes`
- Step 5: Initialize a new git repository?: `No`

#### React Router

Installed using the CLI with its default template. The v8 future flags supported
by the tracked v7 release are enabled after generation so the project represents
React Router's recommended v7 upgrade posture.

- Step 1: `pnpm dlx create-react-router@latest .`
- Step 2: Template: `Default (SSR, TypeScript, and Tailwind CSS)`
- Step 3: Initialize a new git repository?: `No`
- Step 4: Install dependencies with pnpm?: `Yes`

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

#### TanStack Start (React)

Installed using the CLI with the following setup:

- Framework: `React`
- Language: `TypeScript`
- Build tool: `Vite`
- Deployment integration: `Nitro` (the `nitro()` Vite plugin)
- Styling: `Tailwind CSS`
- Development tools: `TanStack Devtools`
- Path aliases: `vite-tsconfig-paths`
- Development server: `vite dev --port 3000`
- Production build: `vite build`

### Dependency Counts

- The starter project view counts every direct production and development
  dependency in the starter's `package.json`, then reports its resolved graph,
  duplicates, and install size.
- The meta-framework direct packages view uses the starter's
  `first-party-dependencies.json`. It keeps only the direct packages maintained
  by the framework's ecosystem, preserving their production/development section
  and version from the starter's `package.json`. Its resolved graph and duplicate
  counts follow those packages through the starter's committed `pnpm-lock.yaml`.
- The starter project's duplicate and install-size metrics use e18e analysis.
  Graph links pass the matching starter or first-party dependency manifest to
  npmgraph. npmgraph resolves those manifests independently, so its transitive
  versions may differ from the committed lockfile counts.

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

### Dev Server Startup

- Dev server startup time measures how long `pnpm dev` takes in a fresh
  temporary copy of the tracked starter files until the first
  `GET http://localhost:<port>/` returns HTTP 200. Dependencies are installed
  outside the timed region with a frozen lockfile and a dedicated store shared
  by the repetitions, the same setup as the build benchmark.
- The clock starts when the `pnpm dev` process is spawned and stops when the
  response headers of the first 200 arrive, so pnpm's own startup, framework
  boot, and the on-demand compile of the home page are all included. The
  response body is not read, because several dev servers stream the page and
  body time would measure page size rather than startup.
- The port is the starter's default dev port, recorded as `devServerPort` in
  `.github/frameworks.json`. The starters are not modified, so whatever they
  ship is inside the measurement: Nuxt and TanStack Start enable devtools,
  and Astro and React Router generate types at boot.
- The dev server runs with a minimal environment (`PATH`, `HOME`, `TMPDIR`,
  `LANG`, `LC_ALL`) plus telemetry opt-outs, so the terminal that launches the
  benchmark cannot change how the framework behaves. Astro, for example,
  switches to a detached background server when it detects an AI agent
  terminal.
- Dev server benchmarks run 5 times by default and report average, minimum,
  and maximum duration.

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
- For Nuxt, the `temporal` feature is temporarily excluded. Nuxt bundles
  devalue's optional Temporal deserializer, but that branch only runs when an
  application has itself serialized a Temporal value.

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

### Package Versions

Current pinned dependencies are listed in each project's `package.json`:

- [Astro](https://github.com/e18e/framework-tracker/blob/main/packages/app-astro/package.json)
- [Next.js](https://github.com/e18e/framework-tracker/blob/main/packages/app-next-js/package.json)
- [Nuxt](https://github.com/e18e/framework-tracker/blob/main/packages/app-nuxt/package.json)
- [React Router](https://github.com/e18e/framework-tracker/blob/main/packages/app-react-router/package.json)
- [SolidStart](https://github.com/e18e/framework-tracker/blob/main/packages/app-solid-start/package.json)
- [SvelteKit](https://github.com/e18e/framework-tracker/blob/main/packages/app-sveltekit/package.json)
- [TanStack Start (React)](https://github.com/e18e/framework-tracker/blob/main/packages/app-tanstack-start-react/package.json)
- [Baseline HTML](https://github.com/e18e/framework-tracker/blob/main/packages/app-baseline-html/package.json)

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
- CI creates one production build and starts one production server, which stays
  running for all five measurements. Each measurement launches a fresh Chrome
  process.
- The arithmetic mean is reported. Raw samples and their sample standard
  deviation are retained.
- Valid slow results are kept rather than discarded as outliers. A measurement
  is invalid only when a required Chrome paint or interaction value is missing
  or not greater than zero.
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
- CI creates one production build and starts one production server, which stays
  running for all five measurements. Each measurement launches a fresh Chrome
  process.
- The arithmetic mean is reported. Raw samples and their sample standard
  deviation are retained.
- Valid slow results are kept rather than discarded as outliers. A measurement
  is invalid only when a required Chrome paint or interaction value is missing
  or not greater than zero.
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

### SSR Load Test

Every table uses ordinary `<a>` links to measure server rendering without router link components. Frameworks with those components use `/server-side-rendered-plain-links`; the others use `/server-side-rendered`.

Both tests render 1,000 rows and three columns: UUID id, UUID name, and a
link with text `View →` and destination `/server-side-rendered/${entry.id}`.
Data comes from `packages/testdata/src/ssr.ts`: UUID rows are created once per
module instance and returned asynchronously with a zero-delay timer. The paired
routes preserve each framework's loader and rendering structure; the intended
table difference is the link implementation. UUID values can differ between
server processes or separately bundled route modules, so equivalence means the
same row schema, count, text, and destination rule, not identical random UUIDs.

Requests still pass through each framework's server routing (baseline HTML uses
its Node HTTP handler). These are HTTP-only tests: no browser runs, no links are
clicked, and browser-only prefetching is not exercised.

Autocannon uses 1, 5, 10, 25, 50, 100, and 200 concurrent connections for about
5 seconds per stage. New measurements repeat the full sweep three times on the
same server, with a five-second warm-up at one connection before each sweep.
The server gets five seconds of recovery between sweeps. An unhealthy warm-up
is retried up to twice, with five seconds of recovery before each retry; a sweep
only starts after a warm-up with requests and no errors. Persistent failures abort
the benchmark. Warm-up requests, including retries, are excluded from the results. Every measured sweep is retained.
The summary and latency charts use the actual sweep with the median peak requests
per second; other metrics belong to that same sweep, rather than independently
computed medians. Individual samples are stored for future variability reporting.
Historical measurements retain their original values as one sample, with unknown
variability and no assumed warm-up. Both use the same production server setup and Node 24
containers on `depot-ubuntu-24.04-16`: 16 CPUs, 64 GB RAM, 180 GB disk, and an
8 GB disk accelerator. Server CPUs are 0–11; Autocannon CPUs are 12–15. Containers
share memory, kernel, Docker runtime, and other host resources. Peak requests/sec
is the highest stage throughput; total requests span all stages. Latency charts
compare percentiles at 25, 50, and 100 connections.

### SSR Router Link Load Test

Uses framework router link components at `/server-side-rendered`, following the framework’s normal setup. Comparing the two tests shows how those components affect server rendering performance. A Results are stored under `ssrRouterLinkLoadTests`.

Both tests render 1,000 rows and three columns: UUID id, UUID name, and a
link with text `View →` and destination `/server-side-rendered/${entry.id}`.
Data comes from `packages/testdata/src/ssr.ts`: UUID rows are created once per
module instance and returned asynchronously with a zero-delay timer. The paired
routes preserve each framework's loader and rendering structure; the intended
table difference is the link implementation. UUID values can differ between
server processes or separately bundled route modules, so equivalence means the
same row schema, count, text, and destination rule, not identical random UUIDs.

Requests still pass through each framework's server routing (baseline HTML uses
its Node HTTP handler). These are HTTP-only tests: no browser runs, no links are
clicked, and browser-only prefetching is not exercised.

Autocannon uses 1, 5, 10, 25, 50, 100, and 200 concurrent connections for about
5 seconds per stage. New measurements repeat the full sweep three times on the
same server, with a five-second warm-up at one connection before each sweep.
The server gets five seconds of recovery between sweeps. An unhealthy warm-up
is retried up to twice, with five seconds of recovery before each retry; a sweep
only starts after a warm-up with requests and no errors. Persistent failures abort
the benchmark. Warm-up requests, including retries, are excluded from the results. Every measured sweep is retained.
The summary and latency charts use the actual sweep with the median peak requests
per second; other metrics belong to that same sweep, rather than independently
computed medians. Individual samples are stored for future variability reporting.
Historical measurements retain their original values as one sample, with unknown
variability and no assumed warm-up. Both use the same production server setup and Node 24
containers on `depot-ubuntu-24.04-16`: 16 CPUs, 64 GB RAM, 180 GB disk, and an
8 GB disk accelerator. Server CPUs are 0–11; Autocannon CPUs are 12–15. Containers
share memory, kernel, Docker runtime, and other host resources. Peak requests/sec
is the highest stage throughput; total requests span all stages. Latency charts
compare percentiles at 25, 50, and 100 connections.

### Core Web Vitals

- Core Web Vital metrics are sourced from
  [HTTP Archive](https://httparchive.org/reports/techreport/tech) technology
  reports.
- The docs publish framework-level desktop and mobile percentages from the latest
  collected HTTP Archive snapshot in the repository.
- Metrics refresh monthly when new HTTP Archive data is collected.

## Code Comparison

The Code Comparison page shows how each framework solves one everyday task. It
is written by hand rather than generated, so it carries its own rules.

- Snippets target the starter project versions published on Dev Time, not the
  latest release of each framework.
- Each titled code block is a complete file. A task is done by writing exactly
  the files shown into a fresh copy of that starter, with no other edits and no
  added dependencies. A block whose title names a file the starter already ships
  replaces it.
- Snippets are kept minimal on purpose. Layouts, styling, metadata, and error
  handling are left out so the framework's own answer to the task is the only
  thing on screen.
- Snippets are verified by writing them into a fresh copy of the starter,
  starting its dev server with `pnpm dev`, and requesting the routes they add.
