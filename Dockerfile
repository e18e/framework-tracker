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

FROM base AS cwv-stats-base
ENV NODE_ENV=production
COPY --from=build /prod/cwv-stats/node_modules /app/node_modules
COPY --from=build /prod/cwv-stats/src /app/src
USER node
WORKDIR /app
CMD [ "node", "src/lcp/index.ts" ]

# LCP Stats
FROM cwv-stats-base AS cwv-stats-lcp
CMD [ "node", "src/lcp/index.ts" ]
