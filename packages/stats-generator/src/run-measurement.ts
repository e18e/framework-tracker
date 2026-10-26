import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { packagesDir } from './constants.ts'
import type { FrameworkConfig } from './types.ts'
import { frameworks } from './frameworks.ts'
import {
  artifactFiles,
  artifactName,
  tasks,
  type MeasurementJob,
  type TaskName,
} from './measurement-pipeline.ts'
import { validateArtifact } from './validate-stats.ts'
import { validateFirstPartyDependencyManifest } from './first-party-dependencies.ts'
import { getPackageJsonDeps, readJsonFile } from './utils.ts'

const repository = join(packagesDir, '..')
export function runMeasurement(job: MeasurementJob, artifacts: string) {
  const config = tasks[job.task]
  const framework: FrameworkConfig | undefined = frameworks.find(
    (item) => item.name === job.framework,
  )
  if (
    !framework ||
    framework[config.project]?.package !== job.package ||
    !framework[config.project]?.measurements.includes(config.measurement)
  )
    throw new Error(`Unsupported measurement: ${JSON.stringify(job)}`)
  const project = join(packagesDir, job.package)
  const run = (command: string, args: string[], cwd = repository) =>
    execFileSync(command, args, { cwd, stdio: 'inherit' })
  const script = (name: string) =>
    run(process.execPath, [
      join(packagesDir, 'stats-generator/src', name),
      job.package,
    ])
  for (const file of artifactFiles(job))
    rmSync(join(project, file), { force: true })
  // Runtime runners must start with fresh data, rather than canonical measurements.
  rmSync(join(project, 'ci-stats.json'), { force: true })
  if (config.project === 'app' || job.task === 'deps')
    run('pnpm', ['install', '--frozen-lockfile'], project)
  if (config.project === 'app') run('pnpm', ['build'], project)
  switch (job.task) {
    case 'install':
      script('run-install-benchmark.ts')
      break
    case 'build':
      script('run-build-benchmark.ts')
      script('run-corejs-scan.ts')
      if (artifactFiles(job).includes('browser-baseline-stats.json'))
        script('run-browser-baseline-scan.ts')
      break
    case 'dev-server':
      script('run-dev-server-benchmark.ts')
      break
    case 'deps': {
      const errors = validateFirstPartyDependencyManifest(
        readJsonFile(join(project, 'first-party-dependencies.json')),
        getPackageJsonDeps(job.package),
      )
      if (errors.length) throw new Error(errors.join('\n'))
      // e18e can return a nonzero status for findings; its JSON must still validate.
      const report = spawnSync(
        'pnpm',
        ['dlx', '@e18e/cli@0.5.0', 'analyze', '--json'],
        {
          cwd: project,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'inherit'],
        },
      )
      if (report.error || report.signal || !report.stdout.trim())
        throw new Error('Dependency analysis produced no report', {
          cause: report.error,
        })
      writeFileSync(join(project, 'e18e-stats.json'), report.stdout)
      script('run-framework-dependency-scan.ts')
      script('run-first-party-dependency-scan.ts')
      script('run-node-engines-scan.ts')
      break
    }
    case 'ssr-load':
    case 'ssr-router-link-load':
      run('pnpm', [
        '--filter',
        '@framework-tracker/stats-generator',
        `run:${job.task}:containerized`,
        job.package,
      ])
      break
    default:
      script(`run-${job.task}-benchmark.ts`)
  }
  validateArtifact(job, project)
  const output = join(artifacts, artifactName(job))
  mkdirSync(output, { recursive: true })
  for (const file of artifactFiles(job))
    copyFileSync(join(project, file), join(output, file))
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const [framework, task, artifacts] = process.argv.slice(2)
    if (!framework || !task || !(task in tasks) || !artifacts)
      throw new Error(
        'Expected framework, measurement task, and artifact directory',
      )
    const config = frameworks.find((item) => item.name === framework)
    const packageName = config?.[tasks[task as TaskName].project]?.package
    if (!packageName) throw new Error(`Unknown framework: ${framework}`)
    runMeasurement(
      { framework, task: task as TaskName, package: packageName },
      artifacts,
    )
  } catch (error) {
    console.error(error)
    process.exitCode = 1
  }
}
