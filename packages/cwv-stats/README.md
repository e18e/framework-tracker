# CWV (Core Web Vitals) Stats – `cwv-stats`

`cwv-stats` is a small Node.js utility that queries the public HTTP Archive dataset in Google BigQuery and
computes **Core Web Vitals statistics for popular JavaScript frameworks**, starting with:

- React
- Next.js

Right now it focuses on **Largest Contentful Paint (LCP)** and returns percentile statistics (p50, p75, p90,
p95, p99) plus basic counts for each framework.

The code that runs the query lives in:

- `src/frameworks/frameworks.ts` – list of frameworks
- `src/query-client/client.ts` – thin BigQuery client wrapper
- `src/lcp/lcp.ts` – LCP query + result shaping
- `src/lcp/index.ts` – entrypoint that runs the LCP query and logs the results

---

## Prerequisites

To run `cwv-stats` locally (inside Docker) you’ll need:

- **Google Cloud Account & Project**.
  Setup your Google Cloud Account and new project named `httparchive` which has access to BigQuery and the HTTP Archive public dataset  
  (e.g. `httparchive.sample_data.pages_10k`, or the full `httparchive.latest.pages` if you have billing enabled on this account).
  Visit [Getting started accessing the HTTP Archive with BigQuery](https://har.fyi/guides/getting-started/)
- **Docker** installed and running on your machine. [Docker Mac Installation](https://docs.docker.com/desktop/setup/install/mac-install/)

You do _not_ need Node or pnpm installed on your host machine if you only use the container workflow.

### Google Cloud / BigQuery setup

1. **Install the gcloud CLI**
   This will be needed for authenticating with BigQuery.
   If your running on a Mac you can install via Homebrew

   ```
       brew update && brew install --cask gcloud-cli
   ```

   More details on installing with Homebrew can be found [here](https://docs.cloud.google.com/sdk/docs/downloads-homebrew)

   For non Mac users try [Install the Google Cloud CLI](https://docs.cloud.google.com/sdk/docs/install-sdk)

2. **Create credentials file for authenticating**
   Once you have setup `gcloud-cli` you will need to authenticate with your account.
   First Initialise the Google Cloud CLI by running:

   ```
   gcloud init
   ```

   Then create your local authentication credentials

   ```
   gcloud auth application-default login
   ```

   This will create the following file:
   - Linux, macOS: `$HOME/.config/gcloud/application_default_credentials.json`
   - Windows: `%APPDATA%\gcloud\application_default_credentials.json`

   When we run the container using `docker compose` on our local machine this file is mounted into the container for Mac users. For Window users
   you may need to update the volume mount in the `docker-compose.yml` file.

3. Set the **project ID** that should be billed for BigQuery queries.
   In the `docker-compose.yml` you will need to set the `GOOGLE_CLOUD_PROJECT` env variable to the project ID used in your GCP account for querying
   the http archive. **Note: This is just temporary until we have a GCP account with billing that we can use to query the full dataset.**.

For general reference on the Node.js BigQuery client library, see:  
[BigQuery API Client Libraries](https://docs.cloud.google.com/bigquery/docs/reference/libraries#client-libraries-usage-nodejs)

---

## Running the container locally

For local development, this repo uses **Docker Compose**. The `cwv-stats-lcp` service builds the image from
the repo root `Dockerfile` and runs the `src/lcp/index.ts` entrypoint to execute the LCP query.

### 1. Authenticate (ADC)

This service uses Google Cloud **Application Default Credentials (ADC)**. The simplest setup for local
development is:

```bash
gcloud auth application-default login
```

### 2. Build the service image

```bash
docker compose build cwv-stats-lcp
```

If you’ve recently changed/installed dependencies or Dockerfile stages, you may want a clean build:

```bash
docker compose build --no-cache cwv-stats-lcp
```

### 3. Run it

From the **repo root**:

```bash
docker compose run cwv-stats-lcp
```

What Compose does (see `docker-compose.yml`):

- Mounts your local ADC credentials file into the container.
- Sets `GOOGLE_APPLICATION_CREDENTIALS` so the BigQuery client can authenticate.
- Sets `GOOGLE_CLOUD_PROJECT` so BigQuery knows which project to bill.
- Mounts `./packages/cwv-stats/src` into `/app/src` so code changes are reflected without rebuilding.

---

## Adding a new image

If you would like to add a new image you can build off of the `cwv-stats-base` image and set the `CMD` to run the project you are interested in.
Multi stage builds are used to keep the overall size of the image as small as possible.
