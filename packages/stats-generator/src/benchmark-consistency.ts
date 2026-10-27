import type { CombinedResult } from '@framework-tracker/results/storage'
import { VARIANCE_THRESHOLD_PERCENT } from '@framework-tracker/results/measurements'
import {
  metricSummaries,
  needsBenchmarkRerun,
} from '@framework-tracker/results/comparison'

export class BenchmarkConsistencyError extends Error {
  constructor(changes: string[]) {
    super(
      [
        `Same-version benchmark means changed by ${VARIANCE_THRESHOLD_PERCENT}% or more:`,
        ...changes,
        'Re-run the generate stats workflow. If the change persists, investigate before accepting a new baseline.',
      ].join('\n'),
    )
    this.name = 'BenchmarkConsistencyError'
  }
}

export function assertBenchmarkConsistency(
  results: Iterable<CombinedResult>,
): void {
  const changes: string[] = []
  for (const result of results) {
    for (const [testName, test] of Object.entries(result.tests)) {
      if (!test) continue
      for (const [path, metric] of metricSummaries(test.result)) {
        if (!needsBenchmarkRerun(metric)) continue
        const percent = metric.variance!.meanPercent
        const version = result.projects[test.project]?.frameworkVersion
        changes.push(
          `${result.framework}/${test.project}/${testName}${path ? `.${path}` : ''}: ${percent >= 0 ? '+' : ''}${percent.toFixed(2)}% (framework ${version} unchanged; threshold ±${VARIANCE_THRESHOLD_PERCENT}%).`,
        )
      }
    }
  }
  if (changes.length) throw new BenchmarkConsistencyError(changes)
}
