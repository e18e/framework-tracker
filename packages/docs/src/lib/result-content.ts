import type { CombinedResult } from '@framework-tracker/results/storage'
import { frameworks } from '@framework-tracker/results/frameworks'
import type { FrameworkResult } from '@framework-tracker/results'

function formatTime(
  value: NonNullable<
    | FrameworkResult['coldBuildTime']
    | FrameworkResult['warmBuildTime']
    | FrameworkResult['devServerStartTime']
  >,
) {
  return {
    medianMs: value.timeMs.median,
    minMs: value.timeMs.min,
    maxMs: value.timeMs.max,
    samplesMs: value.iterations.map((run) => run.timeMs),
  }
}
function formatRendered(
  value: NonNullable<
    | FrameworkResult['clientSideRenderedTests']
    | FrameworkResult['serverSideRenderedTests']
  >,
) {
  if (!('name' in value)) return value
  return {
    ...value,
    firstPaintMs: value.firstPaintMs.median,
    fcpMs: value.fcpMs.median,
    interactionTests: {
      ...value.interactionTests,
      interactionLatencyMs: value.interactionTests.interactionLatencyMs.median,
      inputDelayMs: value.interactionTests.inputDelayMs.median,
      processingDurationMs: value.interactionTests.processingDurationMs.median,
      presentationDelayMs: value.interactionTests.presentationDelayMs.median,
    },
  }
}
export function formatThroughput(
  value: NonNullable<FrameworkResult['ssrRequestThroughputTests']>,
) {
  if ('name' in value)
    return {
      ...value,
      opsPerSec: value.opsPerSec.median,
      latencyMs: value.latencyMs.median,
    }
  return { ...value, latencyMs: value.avgLatencyMs }
}
function formatLoad(value: NonNullable<FrameworkResult['ssrLoadTests']>) {
  const representativeSweep =
    value.iterations[value.representativeIterationIndex]!
  const representativePeak = representativeSweep
    .filter((stage) => stage.errors === 0)
    .reduce((best, stage) =>
      stage.requestsPerSec > best.requestsPerSec ? stage : best,
    )
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
              requests: stage.requests.median,
              errors: stage.errors.median,
              requestsPerSec: stage.requestsPerSec.median,
              avgLatencyMs: stage.avgLatencyMs.median,
              p50LatencyMs: stage.p50LatencyMs.median,
              p75LatencyMs: stage.p75LatencyMs.median,
              p90LatencyMs: stage.p90LatencyMs.median,
              p99LatencyMs: stage.p99LatencyMs.median,
              maxLatencyMs: stage.maxLatencyMs.median,
              bytesPerSec: stage.bytesPerSec.median,
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
    isFocused: framework.focusedFramework ?? false,
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
    isFocused: framework.focusedFramework ?? false,
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
