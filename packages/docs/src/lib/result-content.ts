import {
  FrameworkResultSchema,
  type FrameworkResult,
} from '@framework-tracker/results'

function formatTime(
  value: NonNullable<
    | FrameworkResult['coldBuildTime']
    | FrameworkResult['warmBuildTime']
    | FrameworkResult['devServerStartTime']
  >,
) {
  return {
    avgMs: value.timeMs.mean,
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
    firstPaintMs: value.firstPaintMs.mean,
    fcpMs: value.fcpMs.mean,
    interactionTests: {
      ...value.interactionTests,
      interactionLatencyMs: value.interactionTests.interactionLatencyMs.mean,
      inputDelayMs: value.interactionTests.inputDelayMs.mean,
      processingDurationMs: value.interactionTests.processingDurationMs.mean,
      presentationDelayMs: value.interactionTests.presentationDelayMs.mean,
    },
  }
}
function formatThroughput(
  value: NonNullable<FrameworkResult['ssrRequestThroughputTests']>,
) {
  if ('name' in value)
    return {
      ...value,
      opsPerSec: value.opsPerSec.mean,
      latencyMs: value.latencyMs.mean,
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
              requests: stage.requests.mean,
              errors: stage.errors.mean,
              requestsPerSec: stage.requestsPerSec.mean,
              avgLatencyMs: stage.avgLatencyMs.mean,
              p50LatencyMs: stage.p50LatencyMs.mean,
              p75LatencyMs: stage.p75LatencyMs.mean,
              p90LatencyMs: stage.p90LatencyMs.mean,
              p99LatencyMs: stage.p99LatencyMs.mean,
              maxLatencyMs: stage.maxLatencyMs.mean,
              bytesPerSec: stage.bytesPerSec.mean,
            },
          ]
        : [],
    ),
  }
}

const displayMetadata = {
  name: true,
  type: true,
  package: true,
  isFocused: true,
  order: true,
} as const

export const devtimeContentSchema = FrameworkResultSchema.required({
  ...displayMetadata,
  framework: true,
  packagePath: true,
  prodDependencies: true,
  devDependencies: true,
  allDependencies: true,
  firstPartyDependencies: true,
  install: true,
  coldBuildTime: true,
  warmBuildTime: true,
  timingMeasuredAt: true,
  runner: true,
}).transform((value) => ({
  ...formatRuntime(value),
  coldBuildTime: formatTime(value.coldBuildTime),
  warmBuildTime: formatTime(value.warmBuildTime),
  devServerStartTime:
    value.devServerStartTime && formatTime(value.devServerStartTime),
}))

const runtimeInputSchema = FrameworkResultSchema.required(displayMetadata)
function formatRuntime<T extends ReturnType<typeof runtimeInputSchema.parse>>(
  value: T,
) {
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
export const runtimeContentSchema = runtimeInputSchema
  .required({ ssrRequestThroughputTests: true })
  .transform((value) => ({
    ...formatRuntime(value),
    ssrRequestThroughputTests: formatThroughput(
      value.ssrRequestThroughputTests,
    ),
  }))
export const runtimeVersionsContentSchema =
  runtimeInputSchema.transform(formatRuntime)
