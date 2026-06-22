# Base
FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --filter @framework-tracker/cwv-stats... --prod --frozen-lockfile
RUN pnpm deploy --filter=@framework-tracker/cwv-stats --prod /prod/cwv-stats --legacy

FROM base AS cwv-stats
ENV NODE_ENV=production
COPY --from=build /prod/cwv-stats/node_modules /app/node_modules
COPY --from=build /prod/cwv-stats/src /app/src
RUN chown node:node /app
USER node
WORKDIR /app
CMD [ "node", "src/cwv/index.ts" ]

FROM mcr.microsoft.com/playwright:v1.49.0-noble AS client-side-rendered-benchmark
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
USER pw
