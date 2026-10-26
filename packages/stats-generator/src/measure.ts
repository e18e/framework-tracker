import { mkdirSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { packagesDir } from './constants.ts'
import { measurementJobs, selectFrameworks } from './measurement-pipeline.ts'
import { runMeasurement } from './run-measurement.ts'
import { assembleResults } from './save-ci-stats.ts'

try {
  const selected = selectFrameworks(process.argv.slice(2))
  const base = join(packagesDir, '../artifacts/local')
  mkdirSync(base, { recursive: true })
  const directory = mkdtempSync(join(base, 'measurement-'))
  for (const job of measurementJobs(selected)) runMeasurement(job, directory)
  const output = join(directory, 'results')
  await assembleResults(selected, directory, output)
  console.info(`Local results: ${output}`)
} catch (error) {
  console.error('Measurement failed:', error)
  process.exitCode = 1
}
