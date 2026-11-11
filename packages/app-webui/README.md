# WebUI runtime benchmarks

This runtime-only port of `app-astro` uses WebUI templates and an Axum/Tokio
Rust HTTP server. There is no JavaScript SSR engine, cached table HTML, client
router, or starter benchmark.

Rust allocations use mimalloc v3 through the `mimalloc3` crate's default backend.

## Run

Use the repository's Node and pnpm versions. Rust is pinned by
`rust-toolchain.toml`; Cargo and pnpm each have a committed lockfile.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

Run these commands inside `packages/app-webui`. `HOST` defaults to
`127.0.0.1` and `PORT` to `3000`. Deploy the `dist` directory and start its
`app-webui` executable (`app-webui.exe` on Windows) with the app directory as
the working directory. Node and `node_modules` are not needed at runtime.

On Linux x64, builds target static musl so the executable also runs inside the
shared Debian benchmark container. Install the target and linker before building:

```sh
rustup target add x86_64-unknown-linux-musl
sudo apt-get update
sudo apt-get install -y musl-tools
```

Other platforms build for the native Rust target. The build compiles WebUI
protocols, bundles the client-only components, copies the shared initial-load
CSS, precompresses public assets, and builds the release executable.

## Source layout

Templates and browser components are grouped by route:

```text
src/
  main.rs
  app/
    page.html
    server-side-rendered/
      page.html
      detail.html
    client-side-rendered/
      page.html
      client.ts
      client-table.html
      client-table.ts
      client-detail.html
      client-detail.ts
    ssr-throughput/page.html
    initial-load/page.html
```

WebUI discovers components recursively; paired HTML/TypeScript files stay
together. Each page entry builds into its existing `dist` directory. Client list
and detail views share one page shell. Folders do not register routes: URL
matching and request state remain explicit in `src/main.rs`.

## Routes and comparability

- `/server-side-rendered`: 1,000 server-rendered UUID pairs and ordinary detail
  links. The immutable JSON fixture is generated once at startup and borrowed
  across requests; HTML is rendered for every request.
- `/ssr-throughput`: the same fixture without links. This route is available for
  inspection but is **not** registered for the in-process JavaScript-handler
  throughput benchmark. HTTP transport would not be a comparable substitute.
- `/client-side-rendered`: an empty server table; WebUI generates 1,000 UUID pairs
  in the browser after hydration. The detail component also renders its ID in
  the browser. Both use full-document navigation, like Astro's client-only islands.
- `/initial-load`: the shared three-card content and CSS, without client JavaScript.

The SSR fixture awaits a Tokio 1 ms timer to mirror the Node fixture's
`setTimeout(..., 0)` minimum delay. Timer scheduling is runtime-dependent.
Tokio's multithreaded runtime can use the server's allocated CPUs; the existing
Node apps retain their own production server defaults. Results measure the whole
framework/server configuration, not just template rendering.

The buffered response writer escapes dynamic values directly into the
request-local output string, avoiding temporary escaped strings for each row.
Each page remembers only its last successful output length to reserve the next
request's buffer. Larger responses still grow normally; neither HTML nor response
buffers are retained between requests. This preserves WebUI's six-character
escaping policy without caching rendered content.

Only `/assets/` is public; compiled protocols are not served. Compiler,
Rust renderer, and browser runtime versions must be updated together.

## Checks

```sh
pnpm type-check
pnpm test
cargo fmt --check
cargo clippy --locked --all-targets -- -D warnings
pnpm build
CHROME_PATH=/path/to/chrome pnpm test:browser
```

The browser tests use the shared benchmark process launcher and SSR table verifier,
then exercise real client rendering, document navigation, and initial-load assets.
