# Nifra starter

This starter is a small React app using Nifra's file-based routes, typed navigation, and Web-standard
server handler. Nifra uses Bun for its development and build toolchain; the Node-target production
build uses `@nifrajs/node`'s direct server lane so the benchmark runner exercises the fast path.

```sh
pnpm install
pnpm dev
pnpm build
pnpm start
```

Edit `routes/index.tsx` to begin. Add a page with a `.tsx` file under `routes/`; put its server loader
or action in the matching `.backend.ts` file. `nifra types` generates route-aware types under
`.nifra/types`.
