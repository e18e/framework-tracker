import { globSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import {
  CombinedResultSchema,
  projectResult,
  resultsRoot,
  type CombinedResult,
} from '@framework-tracker/results/storage'
import { withSummaryVariance } from '@framework-tracker/results/comparison'
import { assertBenchmarkConsistency } from './benchmark-consistency.ts'

export function checkStoredBenchmarkConsistency(
  baselineRoot: string,
  currentRoot = resultsRoot,
): void {
  if (!statSync(baselineRoot).isDirectory())
    throw new Error('Expected a baseline results directory')
  const files = [...globSync('*/latest.json', { cwd: currentRoot })]
  if (!files.length) throw new Error('No current benchmark results found')
  const comparisons: CombinedResult[] = []
  for (const file of files) {
    const current = CombinedResultSchema.parse(
      JSON.parse(readFileSync(join(currentRoot, file), 'utf8')),
    )
    let baseline: CombinedResult | null = null
    try {
      baseline = CombinedResultSchema.parse(
        JSON.parse(readFileSync(join(baselineRoot, file), 'utf8')),
      )
    } catch (error) {
      if (!(
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ))
        throw error
    }
    if (baseline && baseline.framework !== current.framework)
      throw new Error(`Mismatched baseline framework: ${file}`)
    const projects = Object.fromEntries(
      (['starter', 'app'] as const)
        .filter((project) => current.projects[project])
        .map((project) => [
          project,
          withSummaryVariance(
            projectResult(current, project),
            baseline?.projects[project]
              ? projectResult(baseline, project)
              : null,
          ),
        ]),
    )
    comparisons.push(
      CombinedResultSchema.parse({
        ...current,
        tests: Object.fromEntries(
          Object.entries(current.tests).map(([name, test]) => [
            name,
            test
              ? {
                  ...test,
                  result: (projects[test.project] as Record<string, unknown>)[
                    name
                  ],
                }
              : undefined,
          ]),
        ),
      }),
    )
  }
  assertBenchmarkConsistency(comparisons)
}

if (import.meta.main) {
  try {
    const baselineRoot = process.argv[2]
    if (!baselineRoot)
      throw new Error(
        'Usage: check-benchmark-consistency <baseline-results-directory>',
      )
    checkStoredBenchmarkConsistency(baselineRoot)
    console.info('Benchmark consistency check passed.')
  } catch (error) {
    console.error(error)
    process.exitCode = 1
  }
}
