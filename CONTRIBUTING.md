# Contributing to Framework Tracker

Framework Tracker is part of the e18e.dev community. Want to get involved head to our Discord at https://chat.e18e.dev. If you your keen to contribute to the project and get stuck straight into code we have an open list of good first issues in our GitHub repo: [Good First Issues](https://github.com/e18e/framework-tracker/issues?q=is%3Aissue%20state%3Aopen%20label%3A%22good%20first%20issue%22). We keep this list updated and add new issues every week. Its one of the easiest ways to get involved and help push the project forward. 

## Where to Start

Framework Tracker has a few different areas which you can contribute to:

- **Improving Metrics**: Suggest new metrics or improve the way we collect and display existing ones.

- **Documentation**: Enhance our documentation site by fixing typos, improving explanations, or adding new sections.

- **UI/UV Improvements**: Help us improve the documentation site by suggesting design improvements, fixing bugs, or adding new features.

- **Adding New Frameworks**: Help us expand our list of tracked frameworks by adding new ones. See the [Adding a New Framework](./CONTRIBUTING.md#adding-a-new-framework) section below for details as this adds the maintenance burden heavily.

### Project Structure

This is a monorepo managed with pnpm workspaces hosting multiple packages however some of the packages are not part of the workspace.

Included in the workspace are the documentation site, built with Astro, and the stats generator, which is a tool for collecting and processing the metrics for each framework.

```
framework-tracker/
├── packages/
│   ├── docs/            # Astro-based documentation site
│   └── stats-generator/ # Tool for collecting framework metrics
```

Outside of the workspace, we have individual packages for each framework's starter project and app project. These are used to run the actual measurements for each framework.

```
framework-tracker/
├── starter-*/       # Metaframeworks configured using default set up
├── app-*/           # Metaframeworks configured for run time tests
```

Any project marked with `starter` in the name should be direct setups of the meta-framework recommended default configuration. For most these we have followed the official getting started guide and used the CLI to set up the project with the recommend path. We often use these to measure dev time performance metrics like build times, dependency counts, and CI performance. It hard to compare meta-frameworks so sometimes it easier to compare the default set up of each framework as this is what most users will start with and gives a good baseline for comparison.

Any project marked with `app` in the name is a more complex set up which we often runtime performance tests. These are often more customized and have more features added on top of the default starter set up. This is because we want to test the performance of each framework under more real world conditions and with more complex features implemented. For example, we might add a blog page with dynamic routing, or a dashboard page with client side interactivity. This allows us to test the performance of each framework under more realistic conditions and see how they perform as the complexity of the app increases.

Having both a `starter` and `app` project for each framework allows us to get a more comprehensive view of the performance of each framework across different use cases and levels of complexity and create more fair comparisons.

### How Metrics Work

Please note that metrics collection is in early stages and the process is likely to change as we iterate on it. The current process is as follows but is subject to change:

We currently run scripts in CI using GitHub Actions or if the test is more complex we run it locally in container and push the results to the repo.

#### CI Metrics Collection

The current flow for collecting metrics is as follows:

1. A PR is merged which triggers the CI Pipeline: `generate-stats` which uses functions from `packages/stats-generator` to run measurements for each framework
2. The CI Pipeline reads the framework config from `.github/frameworks.json` and runs measurements based on each framework's `app` and `starter` config
3. The collected metrics are passed into the final step which runs the scripts from `packages/stats-generator`
4. The `stats-generator` reads `frameworks.json` and generates stats only for the configured measurements

### Framework Configuration

All frameworks are configured in `.github/frameworks.json`. Each entry specifies what measurements to run:

```json
{
  "name": "astro",
  "displayName": "Astro",
  "frameworkPackage": "astro",
  "starter": {
    "package": "starter-astro",
    "buildScript": "build:astro",
    "buildOutputDir": "dist",
    "measurements": [
      { "type": "install", "runFrequency": 5 },
      { "type": "build", "runFrequency": 5 },
      { "type": "dependencies" }
    ]
  },
  "app": {
    "package": "app-astro",
    "buildScript": "build:app-astro",
    "buildOutputDir": "dist",
    "measurements": [{ "type": "ssr" }]
  }
},
```

#### Container Metrics Collection

Coming soon but will also pull from `.github/frameworks.json`

### Versioning


### Adding a New Framework

To add a new framework to the tracker:

1. Create a package in `packages/` (e.g., `packages/starter-astro`)
2. Add necessary scripts to the root `package.json` (e.g., `"build:astro": "pnpm --filter starter-astro build"`)
3. Add an entry to `.github/frameworks.json`:

The CI will automatically pick up the new framework and run only the configured measurements.


### Getting Started