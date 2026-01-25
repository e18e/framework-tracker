# Contributing to Framework Tracker

Framework Tracker is part of the e18e.dev community. Want to get involved head to our Discord at https://chat.e18e.dev.

## Where to Start

Framework Tracker has a few different areas which you can contribute to:

- **Improving Metrics**: Suggest new metrics or improve the way we collect and display existing ones. Find out current roadmap and metrics in [initial-comparison-list.md](./initial-comparison-list.md#ComparableMetrics).

- **Documentation**: Enhance our documentation site by fixing typos, improving explanations, or adding new sections. UI/UX improvements are also welcome!

- **Adding New Frameworks**: Help us expand our list of tracked frameworks by adding new ones. Check out [initial-comparison-list.md](./initial-comparison-list.md#frameworks) for the list of planned tracked frameworks.

### How Metrics Work

We currently run scripts in the CI to measure and collect metrics for each framework. Right now we measure each frameworks starter project.

The current flow for collecting metrics is as follows:

1. A PR is merged which triggers the CI Pipeline: `generate-stats`
2. The CI Pipeline reads the framework config from `.github/frameworks.json` and runs measurements based on each framework's `measurements` array
3. The collected metrics are passed into the final step which runs the scripts in `stats-generator`
4. The `stats-generator` reads `frameworks.json` and generates stats only for the configured measurements

### Framework Configuration

All frameworks are configured in `.github/frameworks.json`. Each entry specifies what measurements to run:

```json
{
  "name": "next",
  "displayName": "Next.js",
  "package": "starter-next-js",
  "buildScript": "build:next",
  "measurements": ["install", "build", "dependencies"]
}
```

**Available measurements:**

| Measurement    | Description                                                     | Required fields |
| -------------- | --------------------------------------------------------------- | --------------- |
| `install`      | Measures clean install time (runs in parallel on fresh runners) | -               |
| `build`        | Measures cold and warm build times                              | `buildScript`   |
| `dependencies` | Counts prod/dev dependencies from package.json                  | -               |

### Adding a New Framework

To add a new framework to the tracker:

1. Create a package in `packages/` (e.g., `packages/starter-astro`)
2. Add necessary scripts to the root `package.json` (e.g., `"build:astro": "pnpm --filter starter-astro build"`)
3. Create the stats file in `packages/docs/src/content/stats/` (e.g., `starter-astro.json`) with empty object `{}`
4. Add an entry to `.github/frameworks.json`:

```json
{
  "name": "astro",
  "displayName": "Astro",
  "package": "starter-astro",
  "buildScript": "build:astro",
  "measurements": ["install", "build", "dependencies"]
}
```

The CI will automatically pick up the new framework and run only the configured measurements.
