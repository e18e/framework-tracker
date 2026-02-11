# Framework Tracker

A comprehensive comparison site for modern meta-frameworks, tracking performance metrics, developer experience, and runtime characteristics across popular options like Next.js, Nuxt, SvelteKit, Astro, and more.

## About

This project aims to provide objective, data-driven comparisons of meta-frameworks to help developers make informed decisions. We track metrics across two key dimensions:

- **Dev Time Performance**: Dependencies, build times, CI/CD performance, and developer experience
- **Runtime Performance**: Core Web Vitals, bundle sizes, hydration strategies, and end-user experience

## Roadmap

See [initial-comparison-list.md](./initial-comparison-list.md) for the full list of frameworks we're tracking and the metrics we're measuring.

## Getting Involved

We welcome contributions from the community! Whether you're interested in adding new frameworks, improving existing metrics, or enhancing the documentation site, your help is appreciated. Check out [CONTRIBUTING.md](./CONTRIBUTING.md) for more details on how to get started.

## Project Structure

This is a monorepo managed with pnpm workspaces:

```
framework-tracker/
├── packages/
│   ├── docs/            # Astro-based documentation site
│   └── stats-generator/ # Tool for collecting framework metrics
│   └── starter-*/       # Metaframeworks configured using default set up
│   └── app-*/           # Metaframeworks configured for run time tests
├── initial-comparison-list.md  # Roadmap and metrics plan
└── package.json           # Workspace root configuration
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version specified in package.json engines, or latest LTS)
- [pnpm](https://pnpm.io/) (recommended package manager)

### Installation

```bash
# Install dependencies
pnpm install
```

### Development

```bash
# Start the documentation site in development mode
pnpm dev:docs

# The site will be available at http://localhost:4321
```

### Build

```bash
# Build the documentation site for production
pnpm build:docs
```

### Preview

```bash
# Preview the production build locally
pnpm preview:docs
```

### Code Quality

```bash
# Check code formatting
pnpm format:check

# Fix code formatting
pnpm format

# Check for linting errors
pnpm lint

# Automatically fix linting issues
pnpm lint:fix

# Run TypeScript type checking
pnpm type-check
```

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

## License

See [LICENSE](./LICENSE) for details.
