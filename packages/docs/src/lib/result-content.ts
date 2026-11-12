import { getLoadPeakStage } from '@framework-performance/results/selection'
import type { CombinedResult } from '@framework-performance/results/storage'
import { frameworks } from '@framework-performance/results/frameworks'
import type {
  FrameworkResult,
  InteractionTimingSchema,
} from '@framework-performance/results'

function formatTime(
  value: NonNullable<
    | FrameworkResult['coldBuildTime']
    | FrameworkResult['warmBuildTime']
    | FrameworkResult['devServerStartTime']
  >,
) {
  return {
    medianMs: value.time.median,
    minMs: value.time.min,
    maxMs: value.time.max,
    samplesMs: value.iterations.map((run) => run.time.value),
  }
}
export function formatRendered(
  value: NonNullable<
    | FrameworkResult['clientSideRenderedTests']
    | FrameworkResult['serverSideRenderedTests']
  >,
) {
  if (!('name' in value)) {
    return {
      ...value,
      firstPaint: value.firstPaint.value,
      fcp: value.fcp.value,
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
    fcpRange: value.fcp,
    firstPaint: value.firstPaint.median,
    fcp: value.fcp.median,
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
  value: NonNullable<FrameworkResult['ssrRequestThroughputTests']>,
) {
  if ('name' in value)
    return {
      ...value,
      operationThroughputRange: value.operationThroughput,
      latencyRange: value.latency,
      operationThroughput: value.operationThroughput.median,
      latency: value.latency.median,
      latencyUnit: value.latency.unit,
    }
  return {
    ...value,
    operationThroughput: value.operationThroughput.value,
    latency: value.avgLatency.value,
    latencyUnit: value.avgLatency.unit,
  }
}
function formatLoad(value: NonNullable<FrameworkResult['ssrLoadTests']>) {
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
              workers: stage.connections,
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
    coldBuildTime:
      result.tests.coldBuildTime?.project === 'app'
        ? result.tests.coldBuildTime.result
        : undefined,
    warmBuildTime:
      result.tests.warmBuildTime?.project === 'app'
        ? result.tests.warmBuildTime.result
        : undefined,
    devServerStartTime:
      result.tests.devServerStartTime?.project === 'app'
        ? result.tests.devServerStartTime.result
        : undefined,
    ssrRequestThroughputTests:
      result.tests.ssrRequestThroughputTests?.project === 'app'
        ? result.tests.ssrRequestThroughputTests.result
        : undefined,
    ssrLoadTests:
      result.tests.ssrLoadTests?.project === 'app'
        ? result.tests.ssrLoadTests.result
        : undefined,
    ssrRouterLinkLoadTests:
      result.tests.ssrRouterLinkLoadTests?.project === 'app'
        ? result.tests.ssrRouterLinkLoadTests.result
        : undefined,
    clientSideRenderedTests:
      result.tests.clientSideRenderedTests?.project === 'app'
        ? result.tests.clientSideRenderedTests.result
        : undefined,
    initialLoadTests:
      result.tests.initialLoadTests?.project === 'app'
        ? result.tests.initialLoadTests.result
        : undefined,
    serverSideRenderedTests:
      result.tests.serverSideRenderedTests?.project === 'app'
        ? result.tests.serverSideRenderedTests.result
        : undefined,
  }
  return {
    ...value,
    coldBuildTime: value.coldBuildTime && formatTime(value.coldBuildTime),
    warmBuildTime: value.warmBuildTime && formatTime(value.warmBuildTime),
    devServerStartTime:
      value.devServerStartTime && formatTime(value.devServerStartTime),
    ssrRequestThroughputTests:
      value.ssrRequestThroughputTests &&
      formatThroughput(value.ssrRequestThroughputTests),
    ssrLoadTests: value.ssrLoadTests && formatLoad(value.ssrLoadTests),
    ssrRouterLinkLoadTests:
      value.ssrRouterLinkLoadTests && formatLoad(value.ssrRouterLinkLoadTests),
    clientSideRenderedTests:
      value.clientSideRenderedTests &&
      formatRendered(value.clientSideRenderedTests),
    serverSideRenderedTests:
      value.serverSideRenderedTests &&
      formatRendered(value.serverSideRenderedTests),
  }
}
export function prepareStarterResult(result: CombinedResult) {
  const framework = frameworks.find((f) => f.name === result.framework)!
  return {
    ...result.projects.starter,
    name: framework.displayName,
    package: framework.starter!.package,
    prodDependencies: result.tests.prodDependencies!.result,
    devDependencies: result.tests.devDependencies!.result,
    allDependencies: result.tests.allDependencies!.result,
    firstPartyDependencies: result.tests.firstPartyDependencies!.result,
    install: result.tests.install!.result,
    duplicateDependencies: result.tests.duplicateDependencies?.result,
    depInstallSize: result.tests.depInstallSize?.result,
    minimumNodeVersion: result.tests.minimumNodeVersion?.result,
    minimumNodeVersionImposedBy:
      result.tests.minimumNodeVersionImposedBy?.result,
    frameworkDependencies: result.tests.frameworkDependencies?.result,
    vendoredCoreJsSize: result.tests.vendoredCoreJsSize?.result,
    vendoredCoreJsUnnecessaryModules:
      result.tests.vendoredCoreJsUnnecessaryModules?.result,
    browserBaselineTests: result.tests.browserBaselineTests?.result,
    coldBuildTime: formatTime(result.tests.coldBuildTime!.result),
    warmBuildTime: formatTime(result.tests.warmBuildTime!.result),
    devServerStartTime:
      result.tests.devServerStartTime &&
      formatTime(result.tests.devServerStartTime.result),
  }
}
