# starter-pracht

This pracht starter is configured for Node.js.

## Commands

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run typecheck`
- `npm run preview`
- `npm run start`

## Files

- `src/routes.ts` defines your app manifest.
- `src/routes/home.tsx` is the first page.
- `src/routes/not-found.tsx` is the not-found page, wired via `notFound`.
- `src/api/health.ts` is a sample API route.

## Navigating

Pracht navigates by route id, not by path: `<Link route="home">`, `href("home")`, `navigate({ route: "home" })`. Dynamic routes take their segments through `params`. The id survives a path change, and `pracht typegen` types both the id and its params — so `<Link href>` is a compile error. Use a plain `<a href>` for external and user-provided URLs.

## Checks

- `pracht verify` validates routes and constraints.
- `pracht plan --write` commits an app-graph snapshot to `.pracht/`; `pracht plan` diffs against it.
- `pracht report` prints a PR-ready summary of both.
