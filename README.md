# Framework Tracker

A comprehensive comparison site for modern meta-frameworks, tracking performance metrics, developer experience, and runtime characteristics across popular options like Next.js, Nuxt, SvelteKit, Astro, and more.

## About

This project aims to provide objective, data-driven comparisons of meta-frameworks to help developers make informed decisions. We track metrics across two key dimensions:

- **Dev Time Performance**: Dependencies, build times, CI/CD performance, and developer experience
- **Runtime Performance**: Core Web Vitals, bundle sizes, hydration strategies, and end-user experience

## Getting Involved

We welcome contributions from the community! Whether you're interested in adding new frameworks, improving existing metrics, or enhancing the documentation site, your help is appreciated. Check out [CONTRIBUTING.md](./CONTRIBUTING.md) for more details on how to get started, our current roadmap, areas where we need help, and how the metrics collection process works.

## Data and Metrics

If you would like to play around with the collected data to build your own visualizations or analyses, you can find the raw data output here:

- Final formatted data: [Dev Time Performance](./packages/docs/src/content/devtime) -> JSON file per framework with all collected metrics

- Final formatted data: [Runtime Performance](./packages/docs/src/content/runtime) -> JSON file per framework with all collected metrics

- Raw data for each framework with past versions can be found in each package:

  Dev Time Performance:
  - [Next.js](./packages/starter-nextjs/ci-stats.json)
  - [Nuxt](./packages/starter-nuxt/ci-stats.json)
  - [SvelteKit](./packages/starter-sveltekit/ci-stats.json)
  - [Astro](./packages/starter-astro/ci-stats.json)
  - [Remix](./packages/starter-remix/ci-stats.json)
  - [SolidStart](./packages/starter-solidstart/ci-stats.json)
  - [Tanstack Start](./packages/starter-tanstack-start-react/ci-stats.json)

  Runtime Performance:
  - [Next.js](./packages/app-nextjs/ci-stats.json)
  - [Nuxt](./packages/app-nuxt/ci-stats.json)
  - [SvelteKit](./packages/app-sveltekit/ci-stats.json)
  - [Astro](./packages/app-astro/ci-stats.json)
  - [Remix](./packages/app-remix/ci-stats.json)
  - [SolidStart](./packages/app-solidstart/ci-stats.json)
  - [Tanstack Start](./packages/app-tanstack-start-react/ci-stats.json)

## Sponsors

<p align="center">
  <a href="https://e18e.dev/sponsors.svg">
    <img src="https://e18e.dev/sponsors.svg" alt="e18e community sponsors" />
  </a>
</p>

## License

See [LICENSE](./LICENSE) for details.
