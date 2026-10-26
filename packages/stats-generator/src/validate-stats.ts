import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import {
  CombinedResultSchema,
  projectResult,
  resultPath,
} from '@framework-tracker/results/storage'
import type { FrameworkConfig, CIStats } from './types.ts'
import {
  artifactFiles,
  artifactName,
  measurementJobs,
  type MeasurementJob,
} from './measurement-pipeline.ts'
import { validateSSRLoadForPersistence } from './ssrLoad/persistence.ts'
import { validateRequestThroughputForPersistence } from './request-throughput.ts'
import {
  getDependencyCountsFromPackageMetadata,
  getDependencyStatsFromE18e,
} from './utils.ts'
import type { E18eStats } from './types.ts'
import {
  BuildStatsSchema,
  CoreJsStatsSchema,
  InstallResultSchema,
  DevServerStatsSchema,
  BrowserBaselineStatsSchema,
  NodeEnginesStatsSchema,
  FrameworkDependencyScanSchema,
  FirstPartyDependencyScanSchema,
  DependencyScanSchema,
  RequestThroughputResultSchema,
  SSRLoadStatsSchema,
  SSRRouterLinkLoadStatsSchema,
  ClientSideRenderedStatsSchema,
  ServerSideRenderedStatsSchema,
} from './schemas.ts'

const fileSchemas: Record<string, z.ZodType> = {
  'install-stats.json': InstallResultSchema,
  'build-stats.json': BuildStatsSchema,
  'corejs-stats.json': CoreJsStatsSchema,
  'dev-server-stats.json': DevServerStatsSchema,
  'browser-baseline-stats.json': BrowserBaselineStatsSchema,
  'node-engines-stats.json': NodeEnginesStatsSchema,
  'framework-dependency-stats.json': FrameworkDependencyScanSchema,
  'first-party-dependency-stats.json': FirstPartyDependencyScanSchema,
}
const appSchemas: Record<string, z.ZodType> = {
  'ssr-request-throughput': RequestThroughputResultSchema,
  'ssr-load': SSRLoadStatsSchema,
  'ssr-router-link-load': SSRRouterLinkLoadStatsSchema,
  'client-side-rendered': ClientSideRenderedStatsSchema,
  'server-side-rendered': ServerSideRenderedStatsSchema,
}
export function readRequiredJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (cause) {
    throw new Error(`Missing or invalid result artifact: ${path}`, { cause })
  }
}
export function validateArtifact(job: MeasurementJob, directory: string) {
  for (const file of artifactFiles(job)) {
    const path = join(directory, file)
    const value = readRequiredJson(path)
    try {
      if (file === 'e18e-stats.json')
        DependencyScanSchema.parse({
          name: 'dependencies',
          ...getDependencyStatsFromE18e(value as E18eStats),
          allDependencies: getDependencyCountsFromPackageMetadata(job.package)
            .allDependencies,
        })
      else
        (file === 'ci-stats.json'
          ? appSchemas[job.task]!
          : fileSchemas[file]!
        ).parse(value)
      if (file === 'ci-stats.json') {
        validateSSRLoadForPersistence(value as CIStats)
        validateRequestThroughputForPersistence(value as CIStats)
      }
    } catch (cause) {
      throw new Error(`Invalid result artifact: ${path}`, { cause })
    }
  }
}
export function validateArtifacts(
  selected: FrameworkConfig[],
  directory: string,
) {
  for (const job of measurementJobs(selected))
    validateArtifact(job, join(directory, artifactName(job)))
}
export function validateResults(selected: FrameworkConfig[], root: string) {
  for (const framework of selected) {
    const combined = CombinedResultSchema.parse(
      readRequiredJson(resultPath(framework.name, undefined, root)),
    )
    if (combined.framework !== framework.name)
      throw new Error(`Wrong framework result: ${framework.name}`)
    for (const project of ['starter', 'app'] as const) {
      if (!framework[project]) continue
      if (!combined.projects[project])
        throw new Error(`Missing ${framework.name} ${project} results`)
      const result = projectResult(combined, project) as CIStats
      validateSSRLoadForPersistence(result)
      validateRequestThroughputForPersistence(result)
      if (result.frameworkVersion && result.frameworkVersion !== 'unknown') {
        const version = CombinedResultSchema.parse(
          readRequiredJson(
            resultPath(framework.name, result.frameworkVersion, root),
          ),
        )
        if (
          version.framework !== framework.name ||
          version.projects[project]?.frameworkVersion !==
            result.frameworkVersion
        )
          throw new Error(
            `Missing version metadata for ${framework.name} ${project}`,
          )
      }
    }
  }
}
