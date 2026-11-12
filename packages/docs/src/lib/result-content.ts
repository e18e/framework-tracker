import { getLoadPeakStage } from '@framework-performance/results/selection'
import type { CombinedResult } from '@framework-performance/results/storage'
import { frameworks } from '@framework-performance/results/frameworks'
import type {
  FrameworkResult,
  InteractionTimingSchema,
} from '@framework-performance/results'

function formatTime(
  value: NonNullable<
    | FrameworkResult['coldBuild']
    | FrameworkResult['warmBuild']
    | FrameworkResult['devServer']
  >,
) {
  return {
    medianMs: value.duration.median,
    minMs: value.duration.min,
    maxMs: value.duration.max,
    samplesMs: value.iterations.map((run) => run.duration.value),
  }
}
export function formatRendered(
  value: NonNullable<
    | FrameworkResult['clientSideRendered']
    | FrameworkResult['serverSideRendered']
  >,
) {
  if (!('name' in value)) {
    return {
      ...value,
      firstPaint: value.firstPaint.value,
      firstContentfulPaint: value.firstContentfulPaint.value,
      interactionTests: value.interactionTests && {
        ...value.interactionTests,
        ...interactionValues(value.interactionTests),
      },
    }
  }
  // Per-phase medians do not add up to the median total, so the phases come
  // from the run whose total is the median.
  const medianRun = [...value.iterations].sort(
    (a, b) =>
      a.interactionTests.interactionLatency.value -
      b.interactionTests.interactionLatency.value,
  )[Math.floor(value.iterations.length / 2)]!
  return {
    ...value,
    firstPaintRange: value.firstPaint,
    firstContentfulPaintRange: value.firstContentfulPaint,
    firstPaint: value.firstPaint.median,
    firstContentfulPaint: value.firstContentfulPaint.median,
    interactionTests: {
      ...value.interactionTests,
      ...interactionValues(medianRun.interactionTests),
    },
  }
}
function interactionValues(
  timings: ReturnType<typeof InteractionTimingSchema.parse>,
) {
  return {
    interactionLatency: timings.interactionLatency.value,
    inputDelay: timings.inputDelay.value,
    processingDuration: timings.processingDuration.value,
    presentationDelay: timings.presentationDelay.value,
  }
}

export function formatThroughput(
  value: NonNullable<FrameworkResult['ssrRequestThroughput']>,
) {
  if ('name' in value)
    return {
      ...value,
      requestThroughputRange: value.requestThroughput,
      latencyRange: value.latency,
      requestThroughput: value.requestThroughput.median,
      latency: value.latency.median,
      latencyUnit: value.latency.unit,
    }
  return {
    ...value,
    requestThroughput: value.requestThroughput.value,
    latency: value.avgLatency.value,
    latencyUnit: value.avgLatency.unit,
  }
}
function formatLoad(value: NonNullable<FrameworkResult['ssrLoad']>) {
  const representativeSweep =
    value.iterations[value.representativeIterationIndex]!
  const representativePeak = getLoadPeakStage(representativeSweep)
  return {
    ...value,
    representativeSweep,
    representativePeak,
    stages: [
      value.stage1,
      value.stage2,
      value.stage3,
      value.stage4,
      value.stage5,
      value.stage6,
      value.stage7,
    ].flatMap((stage) =>
      stage
        ? [
            {
              connections: stage.connections,
              latencyRanges: {
                p75Latency: stage.p75Latency,
                p90Latency: stage.p90Latency,
                p99Latency: stage.p99Latency,
              },
              requests: stage.requests.median,
              errors: stage.errors.median,
              requestThroughput: stage.requestThroughput.median,
              avgLatency: stage.avgLatency.median,
              p50Latency: stage.p50Latency.median,
              p75Latency: stage.p75Latency.median,
              p90Latency: stage.p90Latency.median,
              p99Latency: stage.p99Latency.median,
              maxLatency: stage.maxLatency.median,
              byteThroughput: stage.byteThroughput.median,
            },
          ]
        : [],
    ),
  }
}

export function prepareRuntimeResult(result: CombinedResult) {
  const framework = frameworks.find((f) => f.name === result.framework)!
  const value = {
    ...result.projects.app,
    name: framework.displayName,
    package: framework.app!.package,
    coldBuild:
      result.tests.coldBuild?.project === 'app'
        ? result.tests.coldBuild.result
        : undefined,
    warmBuild:
      result.tests.warmBuild?.project === 'app'
        ? result.tests.warmBuild.result
        : undefined,
    devServer:
      result.tests.devServer?.project === 'app'
        ? result.tests.devServer.result
        : undefined,
    ssrRequestThroughput:
      result.tests.ssrRequestThroughput?.project === 'app'
        ? result.tests.ssrRequestThroughput.result
        : undefined,
    ssrLoad:
      result.tests.ssrLoad?.project === 'app'
        ? result.tests.ssrLoad.result
        : undefined,
    ssrRouterLinkLoad:
      result.tests.ssrRouterLinkLoad?.project === 'app'
        ? result.tests.ssrRouterLinkLoad.result
        : undefined,
    clientSideRendered:
      result.tests.clientSideRendered?.project === 'app'
        ? result.tests.clientSideRendered.result
        : undefined,
    initialLoad:
      result.tests.initialLoad?.project === 'app'
        ? result.tests.initialLoad.result
        : undefined,
    serverSideRendered:
      result.tests.serverSideRendered?.project === 'app'
        ? result.tests.serverSideRendered.result
        : undefined,
  }
  return {
    ...value,
    coldBuild: value.coldBuild && formatTime(value.coldBuild),
    warmBuild: value.warmBuild && formatTime(value.warmBuild),
    devServer: value.devServer && formatTime(value.devServer),
    ssrRequestThroughput:
      value.ssrRequestThroughput &&
      formatThroughput(value.ssrRequestThroughput),
    ssrLoad: value.ssrLoad && formatLoad(value.ssrLoad),
    ssrRouterLinkLoad:
      value.ssrRouterLinkLoad && formatLoad(value.ssrRouterLinkLoad),
    clientSideRendered:
      value.clientSideRendered && formatRendered(value.clientSideRendered),
    serverSideRendered:
      value.serverSideRendered && formatRendered(value.serverSideRendered),
  }
}
export function prepareStarterResult(result: CombinedResult) {
  const framework = frameworks.find((f) => f.name === result.framework)!
  return {
    ...result.projects.starter,
    name: framework.displayName,
    package: framework.starter!.package,
    productionDependencyCount: result.tests.productionDependencyCount!.result,
    developmentDependencyCount: result.tests.developmentDependencyCount!.result,
    totalDependencyCount: result.tests.totalDependencyCount!.result,
    firstPartyDependencies: result.tests.firstPartyDependencies!.result,
    install: result.tests.install!.result,
    duplicateDependencyCount: result.tests.duplicateDependencyCount?.result,
    dependencyInstallSize: result.tests.dependencyInstallSize?.result,
    minimumNodeVersion: result.tests.minimumNodeVersion?.result,
    minimumNodeVersionImposedBy:
      result.tests.minimumNodeVersionImposedBy?.result,
    frameworkDependencies: result.tests.frameworkDependencies?.result,
    vendoredCoreJsSize: result.tests.vendoredCoreJsSize?.result,
    vendoredCoreJsUnnecessaryModules:
      result.tests.vendoredCoreJsUnnecessaryModules?.result,
    browserBaseline: result.tests.browserBaseline?.result,
    coldBuild: formatTime(result.tests.coldBuild!.result),
    warmBuild: formatTime(result.tests.warmBuild!.result),
    devServer:
      result.tests.devServer && formatTime(result.tests.devServer.result),
  }
}
