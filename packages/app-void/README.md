# Void runtime benchmarks

This app uses React Pages and Void's Node target. Its Void, adapter, React, and
build-tool versions match `../starter-void`.

```sh
pnpm install --frozen-lockfile
pnpm type-check
pnpm build
pnpm start
```

The production server runs on `PORT`, defaulting to 3000. The benchmark harness
starts `dist/ssr/index.js` for HTTP and browser tests, and imports
`dist/ssr/app.js` for in-process request-handler throughput.

| Route                               | Workload                                               |
| ----------------------------------- | ------------------------------------------------------ |
| `/server-side-rendered`             | 1,000 server-rendered rows with Void `Link` components |
| `/server-side-rendered-plain-links` | The same loader and table with ordinary anchors        |
| `/server-side-rendered/:id`         | Server-rendered detail destination                     |
| `/ssr-throughput`                   | 1,000 server-rendered rows without links               |
| `/client-side-rendered`             | 1,000 rows generated and rendered in the browser       |
| `/client-side-rendered/:id`         | Client-rendered detail destination                     |
| `/initial-load`                     | The shared landing-page copy, markup, and CSS          |

Server-rendered tables use `testData()` from `../testdata/src/ssr.ts`. Rows are
created once per module instance and loaded through its zero-delay timer on
every request. Rendered output is not cached or prerendered. The React Compiler
and full client hydration remain enabled, as in the generated React starter.

Client-rendered routes use Void's `ssr = false` option. Row UUIDs are generated
in the browser. Both rendering tests use the default Void `Link` behavior for
navigation; the detail routes return the selected ID through ordinary page
loaders.
