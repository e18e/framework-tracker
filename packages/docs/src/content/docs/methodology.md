---
title: Methodology
description: How the Framework Performance project's benchmark metrics are collected.
---

The Framework Performance project creates two types of benchmarks Run Time and Dev Time. Our Dev Time benchmarks use each meta-framework’s `starter-*` package. Each starter follows its framework’s CLI or documented setup, with the selected options and adjustments recorded in the [setup section](/methodology/#default-benchmark-setup). Run Time benchmarks use each meta-framework’s `app-*` package/ Currently, each test uses a different route in its app, configured to meet each test's requirements.

The goal is to show both the default project cost developers inherit when
starting a framework and the runtime cost of serving and hydrating a comparable
app. Repetition and aggregation vary by benchmark, as described in each
benchmark section.

## Default Benchmark Setup

The following setup applies to the repository's benchmarks unless a test section
states otherwise. Framework-specific choices are described in Project Setups
and Framework Specific Notes; additional requirements or differences are listed
with the affected test.

Benchmarks run on Depot GitHub Actions runners using
[`depot-ubuntu-24.04`](https://depot.dev/docs/github-actions/runner-types),
with 2 CPUs, 8 GB RAM (a portion reserved for a 2 GB RAM-backed disk accelerator),
and 100 GB disk. EBS storage is
provisioned with 8,000 IOPS and 250 MB/s throughput. Depot runs each job on a
fresh, single-tenant EC2 instance. Its x86 runners use
[4th Gen AMD EPYC Genoa CPUs](https://depot.dev/docs/github-actions/overview)
and GitHub's standard runner image. The SSR Load Test and SSR Router Link Load
Test use larger, 16-CPU runners, as described in their sections below.

- **Node.js:** The supported Node.js version is pinned in the root `.nvmrc`.
  CI and benchmark containers use that version. CI reads the file directly and SSR
  load containers derive their image tag from it. Dockerfiles pin the same
  version explicitly.
- **Package manager and dependencies:** CI uses the pnpm version declared in the
  root `package.json` and installs dependencies with frozen lockfiles.
- **Framework, adapter, and build tool:** Each project uses the configuration
  committed in its `starter-*` or `app-*` package. Its `package.json`, lockfile,
  and framework configuration identify the UI library, adapter, build tool, and
  dependency versions. These choices can differ between frameworks.
- **Browser tests:** Client- and server-rendered browser tests run directly on
  the runner host using its Chrome installation in headless mode. Puppeteer
  sets an 800 × 600 CSS pixel viewport with device scale factor 1.
  Lighthouse uses the desktop form factor, `throttlingMethod: provided`, and
  disables its screen emulation, with no simulated CPU or network throttling.
  Requests use a local connection to a production server. The Lighthouse flow
  runs only the audits required for the published First Paint, First Contentful
  Paint, and interaction-latency measurements.
- **Recorded environment:** Results include runner details and the measured
  framework version; browser results also include the Chrome version used. Any benchmark that runs multiple itterations record mean, median, minimum, and maximum.

### Framework Build Tools and Adapters

These are the current repository configurations. The build tool applies to both
the Dev Time starter and Run Time app unless noted. The adapter/server column
describes the Run Time app. Starter differences are described in Project Setups;
runtime configuration details are described in Framework Specific Notes.

| Framework      | UI library                           | Bundler / build tool         | Adapter / server    |
| -------------- | ------------------------------------ | ---------------------------- | ------------------- |
| Astro          | Astro; React for client-only content | Vite (via Astro)             | Node adapter        |
| Next.js        | React                                | Turbopack (via `next build`) | Next.js server      |
| Nuxt           | Vue                                  | Vite (via Nuxt)              | Nitro               |
| Pracht         | Preact                               | Vite                         | Node adapter        |
| React Router   | React                                | Vite                         | React Router server |
| SolidStart     | Solid                                | Vite                         | Nitro               |
| SvelteKit      | Svelte                               | Vite                         | Node adapter        |
| TanStack Start | React                                | Vite                         | Nitro               |
| Void           | React                                | Vite                         | No runtime app      |
| Baseline HTML  | None                                 | No build step                | Node.js             |

Baseline HTML is a runtime-only comparison. Each project's `package.json`
declares dependency versions or ranges; its lockfile records resolved versions.
Test-specific rendering and routing choices are described in the relevant
benchmark sections below.

## Dev Time

Dev Time measurements use the repository's `starter-*` packages. These projects
represent each framework's default setup as closely as possible, so the stats
capture the dependency footprint, install cost, build cost, and generated output
of a typical new project.

### Package Versions

Current pinned dependencies are listed in each project's `package.json`:

- [Astro](https://github.com/e18e/framework-performance/blob/main/packages/starter-astro/package.json)
- [Next.js](https://github.com/e18e/framework-performance/blob/main/packages/starter-next-js/package.json)
- [Nuxt](https://github.com/e18e/framework-performance/blob/main/packages/starter-nuxt/package.json)
- [Pracht](https://github.com/e18e/framework-performance/blob/main/packages/starter-pracht/package.json)
- [React Router](https://github.com/e18e/framework-performance/blob/main/packages/starter-react-router/package.json)
- [SolidStart](https://github.com/e18e/framework-performance/blob/main/packages/starter-solid-start/package.json)
- [SvelteKit](https://github.com/e18e/framework-performance/blob/main/packages/starter-sveltekit/package.json)
- [TanStack Start (React)](https://github.com/e18e/framework-performance/blob/main/packages/starter-tanstack-start-react/package.json)
- [Void](https://github.com/e18e/framework-performance/blob/main/packages/starter-void/package.json)

### Project Setups

#### Astro

Installed using the CLI

- Step 1: `pnpm create astro@latest`
- Step 2: Where should we create your new project?: `.`
- Step 3: How would you like to start your new project?: `A basic, helpful starter project`
- Step 4: Install dependencies?: `yes`
- Step 5: Initialize a new git repository?: `No`

The Astro starter builds static output without an adapter or React integration.

#### Next.js

Installed using the CLI with its default selections:

- Step 1: `pnpm dlx create-next-app@latest .`
- Step 2: TypeScript: `Yes` (the default)
- Step 3: Linter: `ESLint` (the default)
- Step 4: React Compiler: `No` (the default)
- Step 5: Tailwind CSS: `Yes` (the default)
- Step 6: Use a `src/` directory: `No` (the default)
- Step 7: App Router: `Yes` (the default)
- Step 8: Import alias: `@/*` (the default)
- Step 9: Cache Components: `Yes` (the default)
- Step 10: Partial Prefetching: `Yes` (enabled with Cache Components)
- Step 11: Include agent guidance (`AGENTS.md`): `Yes` (the default)

Turbopack is the default build tool. Tailwind CSS uses its native Turbopack loader
without a PostCSS configuration. The starter retains the template's Geist fonts,
fetched through `next/font/google`, and its page and layout classes.

#### Nuxt

The starter keeps Nuxt's default welcome screen, enables devtools, and uses the
default Nitro configuration. Both the starter and runtime app declare TypeScript
as a direct development dependency to pin a version compatible with `vue-tsc`,
rather than relying on its automatically installed peer dependency. This package
is included in the starter's full dependency counts.

The Nuxt starter uses its default Nitro configuration.

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

#### Pracht

Installed using the CLI

- Step 1: `pnpm create pracht@0.7.3`
- Step 2: Where should we create your app?: `.`
- Step 3: Deployment adapter?: `Node.js` (the default)
- Step 4: Routing?: `manifest` (the default)
- Step 5: Add Tailwind CSS?: `No` (the default)
- Step 6: Include agent tooling (skills, `.mcp.json`, `AGENTS.md`)?: `No`
- Step 7: Initialize a git repository?: `No`

The generated `Dockerfile` and `.dockerignore` are also removed, as no
measurement uses them.

#### SolidStart

Installed using the CLI. The SolidStart version selected in the generator
matches the framework version tracked by the starter project.

- Step 1: `pnpm create solid .`
- Step 2: What type of project would you like to create?: `SolidStart`
- Step 3: Which version of SolidStart?: `v1 (stable)`
- Step 4: Use Typescript?: `Yes`
- Step 5: Which template would you like to use?: `basic`
- Step 6: Install dependencies: `pnpm install`

The SolidStart starter uses `nitro()` without an explicit preset.

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

The TanStack Start starter uses `nitro()` without an explicit preset.

#### Void

Generated from the published CLI with the following selections:

```sh
pnpm dlx create-void starter-void --toolchain vite --framework react --starter static --deploy none
```

- Build tool: `Vite`
- UI framework: `React`, with the generated React Compiler setting enabled
- Starter: `Static Pages`, without a database or server routes
- Deployment: `None`

### Dependency Counts

- **Core package:** Measures the direct production and development dependencies
  declared by the framework package itself.
- **First-party packages:** Measures the framework-maintained packages listed in
  each starter project's `first-party-dependencies.json` and their resolved
  dependency graph, including duplicate versions.
- **Starter project:** Measures the full starter project's direct dependencies,
  resolved dependency graph, duplicates, and install size.

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
- Each build repetition uses a fresh temporary copy of the tracked starter
  files. Dependencies are installed outside the timed region with a frozen
  lockfile and a dedicated store shared by the repetitions.
- Cold build time measures the first build in that fresh project. Warm build
  time measures a second build in the same project, preserving whatever cache
  or generated output the first build leaves in place.
- Void's build timing includes both the Worker and client builds.
- Next.js uses Turbopack's default production filesystem cache. Warm build
  measurements retain the cache created by the cold build. The timed `next build`
  also includes Next.js's default build-time type checking with the project-local
  `tsc` CLI.

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
  `packages/stats-generator/src/frameworks.ts`. The starters are not modified, so whatever they
  ship is inside the measurement: Nuxt and TanStack Start enable devtools,
  and Astro and React Router generate types at boot.
- The dev server runs with a minimal environment (`PATH`, `HOME`, `TMPDIR`,
  `LANG`, `LC_ALL`) plus telemetry opt-outs, so the terminal that launches the
  benchmark cannot change how the framework behaves. Astro, for example,
  switches to a detached background server when it detects an AI agent
  terminal.

### Core-JS Polyfills

- The scanner searches JavaScript build output files, including browser and
  server files, for vendored
  [core-js](https://github.com/zloirock/core-js/blob/master/packages/core-js-compat/README.md)
  signatures. A match indicates that core-js code is present, but does not by
  itself establish whether that code is unnecessary for every supported runtime.
- Detected core-js versions are compared with the modules required by the last 2
  major versions of Chrome, Firefox, Safari, and Edge.
- The module count comes from the **full detected core-js release**: it counts
  modules that those browser targets support natively. The scanner does not
  verify that each counted module appears in the build output. Browser targets
  also do not determine what server runtimes need.
- The reported size is the combined size of JavaScript files with a core-js
  signature. It includes any other code in those files and is not the size of
  core-js itself.
- For Void, the core-js scan includes both the Worker and client build output.

### Browser Baseline

- The scanner uses
  [baseline-detector](https://github.com/43081j/baseline-detector) to statically
  analyze JavaScript from each starter package's browser-facing production build
  output.
- The scan includes source-like files that baseline-detector supports from the
  production build output, including JavaScript, TypeScript, Vue, and Svelte
  files. Known server, cache, trace, type, and build-tool output is excluded.
- Void's browser baseline scan uses
  `.cloudflare/output/v0/workers/default/assets`, which contains only the client
  output.
- Baseline is baseline-detector's overall target result: `high`, `low`, or
  `limited`. When the result is not `high`, baseline-detector also reports the
  feature ID that determined it.
- Feature is the feature ID that determined a non-high Baseline result.
- Year is the Baseline year the project targets: the newest feature it relies
  on, or blank if any detected feature is not yet Baseline.
- Features is the number of unique web platform feature IDs detected in the
  browser-facing build output.
- For Nuxt, SvelteKit, and TanStack Start, the `temporal` feature is temporarily
  excluded. These starters bundle optional Temporal serialization support
  (devalue in Nuxt and SvelteKit, seroval in TanStack Start), but their
  application code does not serialize Temporal values.

### Minimum Node Version

- The oldest Node.js release that satisfies every `engines.node` range declared by the packages installed in the starter's `node_modules`, dev and prod dependencies included, together with the starter's own `package.json`.

### Duplicate Dependencies

- Duplicate dependency details come from e18e dependency analysis messages
  collected for each starter package.
- All dependency counts come from the starter package's `pnpm-lock.yaml`
  `packages` entries, which include direct and transitive resolved package
  instances.
- A duplicate dependency means multiple installed versions of the same package
  were found in the starter's dependency tree.

## Run Time

Run Time measurements use the repository's `app-*` packages. These apps
implement the same small benchmark routes and data shape wherever possible, so
the stats focus on browser rendering, server rendering, request-handler
throughput, and load behavior for comparable production apps.

### Package Versions

Current pinned dependencies are listed in each project's `package.json`:

- [Astro](https://github.com/e18e/framework-performance/blob/main/packages/app-astro/package.json)
- [Next.js](https://github.com/e18e/framework-performance/blob/main/packages/app-next-js/package.json)
- [Nuxt](https://github.com/e18e/framework-performance/blob/main/packages/app-nuxt/package.json)
- [Pracht](https://github.com/e18e/framework-performance/blob/main/packages/app-pracht/package.json)
- [React Router](https://github.com/e18e/framework-performance/blob/main/packages/app-react-router/package.json)
- [SolidStart](https://github.com/e18e/framework-performance/blob/main/packages/app-solid-start/package.json)
- [SvelteKit](https://github.com/e18e/framework-performance/blob/main/packages/app-sveltekit/package.json)
- [TanStack Start (React)](https://github.com/e18e/framework-performance/blob/main/packages/app-tanstack-start-react/package.json)
- [Baseline HTML](https://github.com/e18e/framework-performance/blob/main/packages/app-baseline-html/package.json)

### Framework Specific Notes

- Astro's runtime app uses standalone mode to serve on-demand routes.
- SolidStart and TanStack Start explicitly select Nitro's `node-server` preset.
- TanStack Start's runtime app replaces the global `Response` constructor with
  srvx's `FastResponse` to improve Node.js throughput. Its Dev Time starter keeps
  the generated setup.
- Nuxt extends `node-server` with an entry that also exposes a fetch handler for
  the request-throughput benchmark.
- Pracht's starter prerenders its home route. Its runtime app uses SSR for
  server-rendered routes and `render: 'spa'` for client-rendered routes, keeping
  default full hydration.
- Next.js's initial-load and SSR pages use `instant = false` to allow
  request-time rendering to block without an explicit Suspense fallback.
  Both linked SSR tables use Client Components. Next.js renders all 1,000
  rows on the server and hydrates the tables when loaded in a browser.

### Client Side Rendered Tests (Lighthouse)

- Each framework renders 1,000 rows in the browser, with two UUID columns and a
  detail link.
- Metrics use Lighthouse flows in Chrome through Puppeteer.
- First Paint and First Contentful Paint are measured during navigation to
  `/client-side-rendered`.
- The benchmark clicks the first row's detail link and waits for the detail
  content.
- Full-document navigations use Lighthouse navigation mode; client-routed
  navigations use timespan mode.
- Interaction latency sums the input delay, processing duration, and
  presentation delay from Lighthouse's INP breakdown. It measures this
  controlled interaction, not page-lifetime INP.
- CI builds once per framework and test, then keeps one production server running
  for all five measurements. Each measurement launches a fresh Chrome process.
- Before all measurements, one HTTP request warms `/client-side-rendered`.
  The response is fully consumed with a ten-second timeout. This warms the
  server, not the measured browsers, and is excluded from results.
- Valid slow results are retained. Paint values and total interaction latency
  must be finite and greater than zero; individual interaction components may
  be zero.
- Each framework uses its supported production routing and rendering controls.
- Next.js disables SSR for the measured table and detail content.
- Astro uses React client-only islands. Its detail link performs a full-document
  navigation; the other tested frameworks use client routers.
- Pracht generates UUID rows in the browser. Both routes use `render: 'spa'`
  and navigate with `<Link>`.

### Server Side Rendered Tests (Lighthouse)

- Each framework renders 1,000 rows on the server, with two UUID columns and a
  detail link.
- Metrics use Lighthouse flows in Chrome through Puppeteer.
- First Paint and First Contentful Paint are measured during navigation to
  `/server-side-rendered`.
- The benchmark clicks the first row's detail link and waits for the detail
  content.
- Full-document navigations use Lighthouse navigation mode; client-routed
  navigations use timespan mode.
- Interaction latency sums the input delay, processing duration, and
  presentation delay from Lighthouse's INP breakdown. It measures this
  controlled interaction, not page-lifetime INP.
- CI builds once per framework and test, then keeps one production server running
  for all five measurements. Each measurement launches a fresh Chrome process.
- Before all measurements, HTTP requests warm `/server-side-rendered` and a
  detail URL with a random UUID. Both responses are fully consumed under one
  ten-second timeout. This warms the server, not the measured browsers, and is
  excluded from results.
- Valid slow results are retained. Paint values and total interaction latency
  must be finite and greater than zero; individual interaction components may
  be zero.
- Links use each framework's production navigation component or ordinary
  anchors, allowing default prefetching. The table is loaded and rendered on
  demand without caching or prerendering its output. Static surrounding shells
  and streaming with empty fallbacks are allowed.
- Pracht uses `<Link>` with default intent (hover/focus) prefetching. Its separate
  plain-link load-test route uses ordinary anchors.
- Astro's table and detail routes use `export const prerender = false` for
  request-time rendering.

### Initial Load

- Each production app serves the same small, styled landing page at
  `/initial-load`, using shared copy, layout, and CSS with system fonts.
- A fresh headless Chrome process navigates to the route once. Lighthouse flow
  collects only the `resource-summary` audit using the default browser setup
  above, without simulated CPU or network throttling.
- Results record transferred bytes (including response headers) and request
  counts, rather than uncompressed source size, build output size, or load time.
  This is a single navigation, not a median across repeated runs.
- HTML means Lighthouse's document category, CSS means stylesheet, and JavaScript
  means script. Inline styles and scripts remain part of the HTML transfer.
  Other combines images, media, fonts, and the remaining resource category.
- The total includes each resource category once. Lighthouse's third-party row
  overlaps those categories and is excluded from the stacks.
- Asset compression is enabled for Nuxt, SolidStart, and TanStack Start through
  Nitro. Other frameworks retain their default production build settings.

### Server Side Throughput Tests

- Each framework renders `/ssr-throughput`: 1,000 rows with UUID id/name columns
  and no links or framework link components.
- Production request handlers receive Web API `Request` objects or mock Node.js
  requests and responses. No TCP connection or browser is involved.
- Each request consumes the complete response, including streamed content.
  Static shells may be reused, but table output is rendered on demand without
  caching.
- UUID rows are created once per module instance and loaded asynchronously
  through a zero-delay timer.
- Each [Tinybench](https://github.com/tinylibs/tinybench) run starts with a
  warm-up, which is excluded from results.
- Duplication factor is the average number of occurrences per unique UUID in a
  separate response collected after timing. A value of 1 means no duplication;
  higher values can reflect serialized hydration data.
- Next.js uses a client component for the table, so its server response includes
  the data needed for hydration. No browser hydration is measured.
- Astro uses `export const prerender = false` for request-time rendering.
- Inspired by [eknkc/ssr-benchmark](https://github.com/eknkc/ssr-benchmark).

### SSR Load Test

- Each table has 1,000 rows with UUID id/name columns and a `View →` link to
  `/server-side-rendered/${entry.id}` using ordinary `<a>` links.
- UUID rows are created once per module instance and loaded asynchronously
  through a zero-delay timer. UUID values may differ between server processes.
- Requests pass through production server routing. No browser runs, links are
  not clicked, and browser prefetching is not exercised.
- Autocannon measures increasing concurrent connection counts. Each run repeats
  the full sweep on the same server, with a warm-up beforehand and recovery
  between runs. Failed warm-ups are retried; persistent failures abort the test.
  Warm-up requests are excluded from results.
- Peak throughput and its connection count come from the sweep with the median
  peak requests per second, using its fastest error-free stage.
- Tests run in production Node.js containers on the larger Depot runner
  described in the setup. The server and Autocannon use separate CPU sets but
  share memory and other host resources.

### SSR Router Link Load Test

- Uses the same methodology as [SSR Load Test](#ssr-load-test), only for
  frameworks with router link components.
- Tests `/server-side-rendered` with those components and their default
  behavior instead of ordinary anchors, showing their server-rendering cost.

## Core Web Vitals

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
