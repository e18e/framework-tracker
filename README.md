# Framework Performance

A comprehensive comparison site for modern meta-frameworks, tracking performance metrics, developer experience, and runtime characteristics across popular options like Next.js, Nuxt, SvelteKit, Astro, and more.

## About

This project aims to provide objective, data-driven comparisons of meta-frameworks to help developers make informed decisions. We track metrics across two key dimensions:

- **Dev Time Performance**: Dependencies, build times, CI/CD performance, and developer experience
- **Runtime Performance**: Core Web Vitals, bundle sizes, hydration strategies, and end-user experience

Methodology and tests can be found inside the docs. You can run locally with `pnpm run dev:docs` or find the deployed version at [Framework Performance](https://frameworks.e18e.dev)

## Getting Involved

We welcome contributions from the community! Whether you're interested in adding new frameworks, improving existing metrics, or enhancing the documentation site, your help is appreciated. Check out [CONTRIBUTING.md](./CONTRIBUTING.md) for more details on how to get started, our current roadmap, project structure, data flows, areas where we need help, and how the metrics collection process works.

## Data and Metrics

If you would like to play around with the collected data to build your own visualizations or analyses, you can find the raw data output here:

- Final formatted data: `packages/results/data/<framework>/latest.json` and `versions/<version>.json`, with `project: "starter"` on each test

- Final formatted data: the same framework result files, with `project: "app"` on each test

- Latest results by framework:

  Dev Time Performance:
  - [Next.js](./packages/results/data/next/latest.json)
  - [Nuxt](./packages/results/data/nuxt/latest.json)
  - [SvelteKit](./packages/results/data/sveltekit/latest.json)
  - [Astro](./packages/results/data/astro/latest.json)
  - [Pracht](./packages/results/data/pracht/latest.json)
  - [React Router](./packages/results/data/react-router/latest.json)
  - [SolidStart](./packages/results/data/solid-start/latest.json)
  - [Tanstack Start](./packages/results/data/tanstack/latest.json)

  Runtime Performance:
  - [Next.js](./packages/results/data/next/latest.json)
  - [Nuxt](./packages/results/data/nuxt/latest.json)
  - [SvelteKit](./packages/results/data/sveltekit/latest.json)
  - [Astro](./packages/results/data/astro/latest.json)
  - [Pracht](./packages/results/data/pracht/latest.json)
  - [React Router](./packages/results/data/react-router/latest.json)
  - [SolidStart](./packages/results/data/solid-start/latest.json)
  - [Tanstack Start](./packages/results/data/tanstack/latest.json)

## Sponsors

<p align="center">
  <a href="https://e18e.dev/sponsor">
    <img src="https://e18e.dev/sponsors.svg" alt="e18e community sponsors" />
  </a>
</p>

## License

See [LICENSE](./LICENSE) for details.
