# Contributing to Framework Tracker

Framework Tracker is part of the e18e.dev community. Want to get involved? Head to our Discord at https://chat.e18e.dev. If you're keen to contribute to the project and get stuck straight into code, we have an open list of good first issues in our GitHub repo: [Good First Issues](https://github.com/e18e/framework-tracker/issues?q=is%3Aissue%20state%3Aopen%20label%3A%22good%20first%20issue%22). We keep this list updated and add new issues every week. It's one of the easiest ways to get involved and help push the project forward.

## Where to Start

Framework Tracker has a few different areas which you can contribute to:

- **Improving Metrics**: Suggest new metrics or improve the way we collect and display existing ones.

- **Documentation**: Enhance our documentation site by fixing typos, improving explanations, or adding new sections.

- **UI/UX Improvements**: Help us improve the documentation site by suggesting design improvements, fixing bugs, or adding new features.

- **Adding New Frameworks**: Help us expand our list of tracked frameworks by adding new ones. See the [Adding a New Framework](./CONTRIBUTING.md#adding-a-new-framework) section below for details, as each new framework adds significant maintenance burden.

### Project Structure

This is a monorepo managed with pnpm workspaces hosting multiple packages. However, some of the packages are not part of the workspace.

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

Any project marked with `starter` in the name should be a direct setup of the meta-framework's recommended default configuration. For most of these, we have followed the official getting started guide and used the CLI to set up the project with the recommended path. We often use these to measure dev time performance metrics like build times, dependency counts, and CI performance. It's hard to compare meta-frameworks, so sometimes it's easier to compare the default setup of each framework, as this is what most users will start with and gives a good baseline for comparison.

Any project marked with `app` in the name is a more complex setup on which we often run runtime performance tests. These are often more customized and have more features added on top of the default starter set up. This is because we want to test the performance of each framework under more real world conditions and with more complex features implemented. For example, we might add a blog page with dynamic routing, or a dashboard page with client side interactivity. This allows us to test the performance of each framework under more realistic conditions and see how they perform as the complexity of the app increases.

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

We use [Dependabot](https://docs.github.com/en/code-security/dependabot) to keep framework versions up to date. Dependabot is configured to open PRs for minor and major version bumps on a weekly schedule, grouped by framework (e.g., a single PR for both `starter-nextjs` and `app-nextjs`).

When a Dependabot PR is opened, a CI workflow (`sync-version`) runs automatically to check that the `starter` and `app` packages for each framework are using the same version of the core framework package. If there is a mismatch, the CI will fail and provide instructions on which `package.json` to update. This ensures that we are always comparing the same version of a framework across both project types.

If you need to manually bump a framework version, make sure to update both the `starter-*` and `app-*` packages for that framework to the same version, then run `pnpm install` in each package directory to update the lockfile.

### Adding a New Framework

Adding a new framework increases the maintenance burden, so please open an issue to discuss it before starting work. If approved, follow these steps:

1. **Create the starter package**: Add a new directory in `packages/` (e.g., `packages/starter-my-framework`). Set it up using the framework's official CLI or getting started guide with the recommended defaults. The starter should not be added to the pnpm workspace — it has its own independent `package.json` and lockfile.

2. **Create the app package** (optional): If runtime performance testing is planned, add an `app-*` package (e.g., `packages/app-my-framework`) with a more complex setup that includes features like dynamic routing or client-side interactivity.

3. **Add an entry to `.github/frameworks.json`**: Configure the framework's measurements:
   ```json
   {
     "name": "my-framework",
     "displayName": "My Framework",
     "frameworkPackage": "my-framework",
     "focusedFramework": false,
     "starter": {
       "package": "starter-my-framework",
       "buildScript": "build:my-framework",
       "buildOutputDir": "dist",
       "measurements": [
         { "type": "install", "runFrequency": 5 },
         { "type": "build", "runFrequency": 5 },
         { "type": "dependencies" }
       ]
     }
   }
   ```
   Set `focusedFramework` to `false` for new additions unless the framework is a priority for tracking.

4. **Test locally**: Make sure the framework builds successfully by running the build script from inside the package directory

5. CI for `sync-version` and `validate-stats` will automatically run on the new framework once it's added to `frameworks.json`.

6. **Submit a PR**: Open a pull request with the new packages and configuration. Once merged, the CI will automatically pick up the new framework and raise a PR with new metrics once your PR is merged.


### Getting Started

To get the project running locally:

1. **Prerequisites**: Make sure you have [Node.js](https://nodejs.org/) (v24+) and [pnpm](https://pnpm.io/) installed.

2. **Clone the repo**:
   ```bash
   git clone https://github.com/e18e/framework-tracker.git
   cd framework-tracker
   ```

3. **Install workspace dependencies**:
   ```bash
   pnpm install
   ```
   This installs dependencies for the workspace packages (docs and stats-generator). The `starter-*` and `app-*` packages are not part of the workspace and have their own lockfiles.

4. **Run the docs site locally**:
   ```bash
   pnpm dev:docs
   ```

5. **Linting and formatting**:
   ```bash
   pnpm lint:all        # Run linting across workspace and framework packages
   pnpm format          # Format code with Prettier
   pnpm type-check:all  # Run type checking across workspace and framework packages
   ```