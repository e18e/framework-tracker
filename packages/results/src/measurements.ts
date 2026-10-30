/** Shared defaults for every framework. Scans run once; benchmarks repeat. */
export const measurements = {
  install: { runs: 5 },
  build: { runs: 5 },
  devServer: { runs: 5 },
  dependencies: {},
  browserBaseline: {},
  nodeEngines: {},
  ssrRequestThroughput: { runs: 5 },
  ssrLoad: { runs: 3 },
  ssrRouterLinkLoad: { runs: 3 },
  clientSideRendered: { runs: 5 },
  serverSideRendered: { runs: 5 },
  initialLoad: {},
} satisfies Record<string, { runs?: number }>

export type MeasurementName = keyof typeof measurements
