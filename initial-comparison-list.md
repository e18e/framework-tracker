# Meta-Frameworks Comparison

## Frameworks

- [Next.js](https://nextjs.org) - React
- [Nuxt](https://nuxt.com) - Vue
- [SvelteKit](https://kit.svelte.dev) - Svelte
- [Remix](https://remix.run) - React
- [Astro](https://astro.build) - Framework-agnostic
- [SolidStart](https://start.solidjs.com) - Solid
- [Qwik](https://qwik.dev/docs/) - Qwik
- [TanStack Start](https://tanstack.com/start/latest/docs/framework/react/overview) - Framework-agnostic (React, Solid, Vue planned)

> **Note on TanStack Start**: Since it's becoming framework-agnostic, we could either:
> - Test TanStack Start + React only as the most common
> - Drop it from direct comparisons
> - Include multiple TanStack Start entries (one per supported framework)


## Comparable Metrics

To keep comparisons fair across these metrics I think each check needs to done twice.

- Once with the default template or create project each meta-framework has
- Once with an app created by us with the same features implemented in each meta-framework

### Dev Time Performance

Metrics affecting developer productivity, build times, and CI/CD pipeline performance.

#### Dependencies & Installation
- Total dependency count (production + dev)
- Peer dependency conflicts/warnings
- Production dependencies (direct + transitive)
- Dev dependencies (direct + transitive)
- Duplicate packages in tree (same package, different versions)
- `node_modules` size (production only)
- `node_modules` size (with dev dependencies)
- Install time (clean `npm install` / `pnpm install` / `yarn install`)
- Minimum Node version (lowest `engines.node` in entire dependency tree)
- Unmaintained packages (no release in 1+ years) <!-- is one year too short? -->

#### Build & Compilation
- Cold build time (clean install → production build complete)
- Warm build time (incremental rebuild with cache)
- Build output size (total bytes of production build)
- Peak memory during production build
- Default bundler used (Vite, Webpack, Turbopack, Rspack, etc.)
- Bundler configuration complexity (zero-config vs requires setup)
- Number of build warnings (default config)

#### Development Experience
- Development server startup time
- Hot Module Replacement (HMR) / Fast Refresh speed
- Time from file save to browser update (feedback loop)
- TypeScript support (zero-config yes/no)
- Error message quality (clear vs cryptic) <!-- honestly no idea how to measure this one lol but I do feel the impact when building if you get clear error messages from the framework -->
- DevTools available (framework-specific browser extensions)

#### CI/CD Performance
- CI build time <!-- maybe just compare in Github Actions to start with? -->
- CI cache effectiveness (build time with warm cache)

#### Code Quality & Security
- Packages with known vulnerabilities
  - Critical/high severity vulnerabilities
  - The others
- Days to patch critical issues
- Code quality issues found by linters
  - Maybe time to use our linter [e18e linter](https://github.com/e18e/eslint-plugin)
- Use of deprecated Node.js APIs in dependencies

#### Testing
- Speed when of tests when used in component tests (jest and Vitest) 
  - <!-- For example adding TanStack Router into a component tests increase the initial warm up time in Vitest -->
  - <!-- Should probably compare running tests in CI/CD as well? -->

### ⚡ Runtime Performance

Metrics affecting end-user experience, page load times, and browser performance.

<!--  
I want to point out a lot of the stuff in this list will be tricky to do for example we need to do these tests for

- each rendering mode
- default template the repo sets up (lots of people never change the settings)
- a small app we create to tests same features over each framework

This is without even getting into the fact the some of these frameworks run differently i.e NextJS runs best on Vercel due to Vercel magic so we would have to run these tests/checks in a few places lol
-->

#### Core Web Vitals
- Largest Contentful Paint (LCP) 
- Interaction to Next Paint (INP)
- Cumulative Layout Shift (CLS)
- First Contentful Paint (FCP)
- Time to Interactive (TTI)

#### Bundle Analysis
- Initial JS bundle size (first page load, eager JS)
- Total JS shipped for a simple multi-page app
- Framework runtime size (framework's own overhead)
- Initial CSS bundle size
- Number of chunks generated
- Duplicate code in bundles (same code, different chunks)
- Tree-shaking effectiveness (measured on test with unused exports)
- Total bytes transferred (HTML + CSS + JS + assets)
- Default Code splitting strategy
- Lazy loading support
- Asset optimisation (minification, compression)

#### Hydration & Interactivity
- Hydration strategy (none/partial/full/islands)
- Time to hydrate (if applicable)
- Works without JavaScript (progressive enhancement yes/no)
- JavaScript required for navigation (yes/no)

#### Web Standards & Legacy Code
- Polyfills included in production bundle
- Polyfills for >95% supported features (waste indicators)
- Dead/unused code in production bundle
- Module format (ESM, CJS, UMD, or mixed)
- Native FormData usage vs framework abstraction


### 📋 Framework Context

Additional information that doesn't fit into dev time or runtime performance but provides important context.

#### Capabilities
**Rendering modes supported** (yes/no for each)
- Static Site Generation (SSG)
- Server-Side Rendering (SSR)
- Client-Side Rendering (CSR)
- Incremental Static Regeneration (ISR)
- Streaming SSR

**Built-in features** (yes/no for each)
- File-system based routing
- API routes / server functions
- Image optimisation
- Internationalisation (i18n)
- Middleware support

**Deployment targets** (officially supported)
- Vercel, Netlify, Cloudflare, AWS, self-hosted Docker, etc.

#### Standards Compliance

- Web standards vs custom APIs ratio

#### Starter Template Analysis
Using official "create" commands or template
- Default number of dependencies
- Default install size
- Default build output size
- Default linting setup

#### Community Health

<!-- Not sure if we should include these. Especially stars as it can be very miss-leading -->

- GitHub stars
- npm downloads (weekly average)
- Open issues vs closed issues ratio
- Releases per year
- Corporate backing (yes/no + company name)