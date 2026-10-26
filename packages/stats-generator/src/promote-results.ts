import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import {
  CombinedResultSchema,
  mergeProjectResult,
  projectResult,
  resultPath,
  resultsRoot,
  type CombinedResult,
} from '@framework-tracker/results/storage'
import type { FrameworkConfig } from './types.ts'
import { readRequiredJson, validateResults } from './validate-stats.ts'

function readExistingResult(path: string): CombinedResult | null {
  try {
    return CombinedResultSchema.parse(JSON.parse(readFileSync(path, 'utf8')))
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return null
    }
    throw error
  }
}

export function promoteResults(
  selectedFrameworks: FrameworkConfig[],
  sourceRoot: string,
  destinationRoot = resultsRoot,
) {
  validateResults(selectedFrameworks, sourceRoot)
  for (const framework of selectedFrameworks) {
    const sourceLatestPath = resultPath(framework.name, undefined, sourceRoot)
    const latest = CombinedResultSchema.parse(
      readRequiredJson(sourceLatestPath),
    )

    // Update each measured project while preserving its sibling's older results.
    for (const project of ['starter', 'app'] as const) {
      const projectConfig = framework[project]
      const version = latest.projects[project]?.frameworkVersion
      if (!projectConfig || !version || version === 'unknown') continue

      const incomingVersion = CombinedResultSchema.parse(
        readRequiredJson(resultPath(framework.name, version, sourceRoot)),
      )
      const destinationVersionPath = resultPath(
        framework.name,
        version,
        destinationRoot,
      )
      const mergedVersion = mergeProjectResult(
        readExistingResult(destinationVersionPath),
        projectConfig.package,
        projectResult(incomingVersion, project),
      )
      mkdirSync(dirname(destinationVersionPath), { recursive: true })
      writeFileSync(
        destinationVersionPath,
        JSON.stringify(mergedVersion, null, 2) + '\n',
      )
    }

    // Current results are a complete snapshot and must not retain old measurements.
    const destinationLatestPath = resultPath(
      framework.name,
      undefined,
      destinationRoot,
    )
    mkdirSync(dirname(destinationLatestPath), { recursive: true })
    copyFileSync(sourceLatestPath, destinationLatestPath)
  }
}
