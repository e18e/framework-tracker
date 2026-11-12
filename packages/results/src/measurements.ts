const ssrLoad = {
  runs: 3,
  stageConnections: [1, 5, 10, 25, 50, 100, 200],
  stageDurationMs: 5_000,
  warmupDurationMs: 5_000,
  warmupAttempts: 3,
  recoveryMs: 5_000,
  path: '/server-side-rendered',
} as const

const interactionScenario = 'first-row-detail-navigation'

/** Shared defaults for every framework. Scans run once; benchmarks repeat. */
export const measurements = {
  install: { runs: 5 },
  build: { runs: 5 },
  devServer: { runs: 5 },
  dependencies: null,
  browserBaseline: null,
  nodeEngines: null,
  ssrRequestThroughput: {
    runs: 5,
    durationMs: 10_000,
    warmupDurationMs: 250,
    minimumRequests: 64,
    warmupMinimumRequests: 16,
    path: '/ssr-throughput',
  },
  ssrLoad: { ...ssrLoad },
  ssrRouterLinkLoad: { ...ssrLoad },
  clientSideRendered: { runs: 5, scenario: interactionScenario },
  serverSideRendered: { runs: 5, scenario: interactionScenario },
  initialLoad: {
    path: '/initial-load',
  },
} as const

export type MeasurementName = keyof typeof measurements
