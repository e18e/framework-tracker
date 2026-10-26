import { frameworks } from './frameworks.ts'
import type { FrameworkConfig } from './types.ts'

export const tasks = {
  install: {
    project: 'starter',
    measurement: 'install',
    files: ['install-stats.json'],
  },
  build: {
    project: 'starter',
    measurement: 'build',
    files: ['build-stats.json', 'corejs-stats.json'],
  },
  'dev-server': {
    project: 'starter',
    measurement: 'devServer',
    files: ['dev-server-stats.json'],
  },
  deps: {
    project: 'starter',
    measurement: 'dependencies',
    files: [
      'e18e-stats.json',
      'framework-dependency-stats.json',
      'first-party-dependency-stats.json',
      'node-engines-stats.json',
    ],
  },
  'client-side-rendered': {
    project: 'app',
    measurement: 'clientSideRendered',
    files: ['ci-stats.json'],
  },
  'server-side-rendered': {
    project: 'app',
    measurement: 'serverSideRendered',
    files: ['ci-stats.json'],
  },
  'ssr-request-throughput': {
    project: 'app',
    measurement: 'ssrRequestThroughput',
    files: ['ci-stats.json'],
  },
  'ssr-load': {
    project: 'app',
    measurement: 'ssrLoad',
    files: ['ci-stats.json'],
  },
  'ssr-router-link-load': {
    project: 'app',
    measurement: 'ssrRouterLinkLoad',
    files: ['ci-stats.json'],
  },
} as const
export type TaskName = keyof typeof tasks
export interface MeasurementJob {
  framework: string
  package: string
  task: TaskName
}

export function measurementJobs(
  selected: readonly FrameworkConfig[],
): MeasurementJob[] {
  return selected.flatMap((framework) =>
    Object.entries(tasks).flatMap(([task, config]) => {
      const project = framework[config.project]
      return project?.measurements.includes(config.measurement)
        ? [
            {
              framework: framework.name,
              package: project.package,
              task: task as TaskName,
            },
          ]
        : []
    }),
  )
}

export function artifactFiles(job: MeasurementJob): string[] {
  const files: string[] = [...tasks[job.task].files]
  const framework: FrameworkConfig | undefined = frameworks.find(
    (item) => item.name === job.framework,
  )
  if (
    job.task === 'build' &&
    framework?.starter?.measurements.includes('browserBaseline')
  )
    files.push('browser-baseline-stats.json')
  return files
}
export function artifactName(job: MeasurementJob) {
  return `${job.task}-stats-${job.framework}`
}
export function isLoadJob(job: MeasurementJob) {
  return job.task === 'ssr-load' || job.task === 'ssr-router-link-load'
}

export function selectFrameworks(args: string[]): FrameworkConfig[] {
  if (args.length === 1 && args[0] === '--all') return frameworks
  if (args.length === 2 && args[0] === '--framework') {
    const framework = frameworks.find((item) => item.name === args[1])
    if (framework) return [framework]
  }
  throw new Error('Usage: pnpm measure --framework <name> | pnpm measure --all')
}

const generated = /(?:^|\/)(?:ci-stats\.json|[^/]*-stats\.json|stats\/.*)$/
export function selectChangedFrameworks(files: string[]): FrameworkConfig[] {
  const selected = new Set<string>()
  let shared = false
  for (const file of files) {
    if (generated.test(file) || /\.(?:md|mdx)$/.test(file)) continue
    const framework = frameworks.find((item) =>
      [item.starter?.package, item.app?.package].some(
        (pkg) => pkg && file.startsWith(`packages/${pkg}/`),
      ),
    )
    if (framework) selected.add(framework.name)
    else if (
      /^packages\/(?:stats-generator|results|testdata)\//.test(file) ||
      /^(?:package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|tsconfig\.json|Dockerfile|\.dockerignore|docker-compose\.yml|\.npmrc|\.nvmrc)$/.test(
        file,
      ) ||
      /^\.github\/workflows\/(?:measure|benchmark)/.test(file)
    )
      shared = true
  }
  return shared || selected.size > 1
    ? frameworks
    : frameworks.filter((item) => selected.has(item.name))
}
