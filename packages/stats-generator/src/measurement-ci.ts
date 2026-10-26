import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { FrameworkConfig } from './types.ts'
import { frameworks } from './frameworks.ts'
import {
  isLoadJob,
  measurementJobs,
  selectChangedFrameworks,
  selectFrameworks,
} from './measurement-pipeline.ts'
import { assembleResults } from './save-ci-stats.ts'
import { promoteResults } from './promote-results.ts'

try {
  const [command, ...args] = process.argv.slice(2)
  if (command === 'select') {
    const event = JSON.parse(
      readFileSync(process.env.GITHUB_EVENT_PATH!, 'utf8'),
    )
    let selected: FrameworkConfig[] = frameworks
    if (process.env.GITHUB_EVENT_NAME === 'workflow_dispatch')
      selected = selectFrameworks(
        event.inputs.framework === 'all'
          ? ['--all']
          : ['--framework', event.inputs.framework],
      )
    else if (
      ['pull_request', 'push'].includes(process.env.GITHUB_EVENT_NAME!)
    ) {
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
      selected = selectChangedFrameworks(files)
    }
    const jobs = measurementJobs(selected)
    const outputs = {
      frameworks: selected.map((item) => item.name),
      standard: jobs.filter((job) => !isLoadJob(job)),
      load: jobs.filter(isLoadJob),
      'has-changes': selected.length > 0,
    }
    for (const [key, value] of Object.entries(outputs))
      appendFileSync(
        process.env.GITHUB_OUTPUT!,
        `${key}=${JSON.stringify(value)}\n`,
      )
  } else if (command === 'assemble') {
    const names: string[] = JSON.parse(process.env.SELECTED_FRAMEWORKS!)
    if (
      !names.length ||
      names.some((name) => !frameworks.some((item) => item.name === name))
    )
      throw new Error('Invalid framework selection')
    const selected = frameworks.filter((item) => names.includes(item.name))
    const output = resolve(args[1]!)
    await assembleResults(selected, resolve(args[0]!), output)
  } else if (command === 'promote') {
    const names: string[] = JSON.parse(process.env.SELECTED_FRAMEWORKS!)
    const selected = names.map((name) => {
      const framework = frameworks.find((item) => item.name === name)
      if (!framework) throw new Error(`Unknown framework: ${name}`)
      return framework
    })
    promoteResults(selected, resolve(args[0]!))
  } else throw new Error('Expected select, assemble, or promote')
} catch (error) {
  console.error('Measurement pipeline failed:', error)
  process.exitCode = 1
}
