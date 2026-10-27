import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { frameworks } from './frameworks.ts'
import {
  isLoadJob,
  measurementJobs,
  shouldMeasure,
} from './measurement-pipeline.ts'
import { assembleResults } from './save-ci-stats.ts'
import { promoteResults } from './promote-results.ts'

try {
  const [command, ...args] = process.argv.slice(2)
  if (command === 'select') {
    let hasChanges = true
    if (['pull_request', 'push'].includes(process.env.GITHUB_EVENT_NAME!)) {
      const event = JSON.parse(
        readFileSync(process.env.GITHUB_EVENT_PATH!, 'utf8'),
      )
      const base = event.pull_request?.base.sha ?? event.before
      const head = event.pull_request?.head.sha ?? event.after
      // Missing history fails clearly rather than silently skipping measurements.
      const files = execFileSync(
        'git',
        [
          'diff',
          '--name-only',
          '-z',
          ...(event.pull_request ? [`${base}...${head}`] : [base, head]),
        ],
        { encoding: 'utf8' },
      )
        .split('\0')
        .filter(Boolean)
      hasChanges = shouldMeasure(files)
    }
    const jobs = hasChanges ? measurementJobs(frameworks) : []
    const outputs = {
      standard: jobs.filter((job) => !isLoadJob(job)),
      load: jobs.filter(isLoadJob),
      'has-changes': hasChanges,
    }
    for (const [key, value] of Object.entries(outputs))
      appendFileSync(
        process.env.GITHUB_OUTPUT!,
        `${key}=${JSON.stringify(value)}\n`,
      )
  } else if (command === 'assemble') {
    const output = resolve(args[1]!)
    await assembleResults(frameworks, resolve(args[0]!), output)
  } else if (command === 'promote') {
    promoteResults(frameworks, resolve(args[0]!))
  } else throw new Error('Expected select, assemble, or promote')
} catch (error) {
  console.error('Measurement pipeline failed:', error)
  process.exitCode = 1
}
