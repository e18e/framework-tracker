import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { FrameworkResultSchema } from './schemas.ts'
import { frameworks } from './frameworks.ts'

export const resultsRoot = fileURLToPath(
  new URL('../../../results/', import.meta.url),
)
const metadataFields = {
  framework: true,
  packagePath: true,
  name: true,
  type: true,
  package: true,
  isFocused: true,
  order: true,
  timingMeasuredAt: true,
  runner: true,
  browserVersion: true,
  frameworkVersion: true,
  releasedAt: true,
  packageJson: true,
} as const
const metadataKeys = new Set(Object.keys(metadataFields))
const ProjectSchema = z.enum(['starter', 'app'])
const ProjectMetadataSchema =
  FrameworkResultSchema.pick(metadataFields).strict()
const measurementSchemas =
  FrameworkResultSchema.omit(metadataFields).required().shape
const testSchemas = Object.fromEntries(
  Object.entries(measurementSchemas).map(([name, result]) => [
    name,
    z.strictObject({ project: ProjectSchema, result }).optional(),
  ]),
) as {
  [K in keyof typeof measurementSchemas]: z.ZodOptional<
    z.ZodObject<{
      project: typeof ProjectSchema
      result: (typeof measurementSchemas)[K]
    }>
  >
}
export const CombinedResultSchema = z
  .strictObject({
    framework: FrameworkResultSchema.shape.framework.unwrap(),
    projects: z.partialRecord(ProjectSchema, ProjectMetadataSchema),
    tests: z.strictObject(testSchemas),
  })
  .superRefine((value, context) => {
    for (const [name, test] of Object.entries(value.tests)) {
      if (test && !value.projects[test.project])
        context.addIssue({
          code: 'custom',
          path: ['tests', name, 'project'],
          message: 'Test project must have corresponding metadata',
        })
    }
  })
export type CombinedResult = z.infer<typeof CombinedResultSchema>

export type ProjectResult = z.infer<typeof FrameworkResultSchema>

export function projectResult(
  result: CombinedResult,
  project: 'starter' | 'app',
): ProjectResult {
  return FrameworkResultSchema.parse({
    ...result.projects[project],
    ...Object.fromEntries(
      Object.entries(result.tests)
        .filter(([, test]) => test?.project === project)
        .map(([name, test]) => [name, test?.result]),
    ),
  })
}
export function resultLocation(packageName: string) {
  for (const framework of frameworks)
    for (const project of ['starter', 'app'] as const) {
      if (framework[project]?.package === packageName)
        return { framework: framework.name, project }
    }
  throw new Error(`Unknown result project: ${packageName}`)
}
export function resultPath(
  framework: string,
  version?: string,
  root = resultsRoot,
) {
  return version
    ? join(root, framework, 'versions', `${version}.json`)
    : join(root, framework, 'latest.json')
}
export function readProjectResult(
  packageName: string,
  version?: string,
  root = resultsRoot,
) {
  const location = resultLocation(packageName)
  try {
    return projectResult(
      CombinedResultSchema.parse(
        JSON.parse(
          readFileSync(resultPath(location.framework, version, root), 'utf8'),
        ),
      ),
      location.project,
    )
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      return null
    throw error
  }
}
export function mergeProjectResult(
  existing: CombinedResult | null,
  packageName: string,
  stats: Record<string, unknown>,
): CombinedResult {
  FrameworkResultSchema.parse(stats)
  const { framework, project } = resultLocation(packageName)
  const combined: {
    framework: string
    projects: Partial<Record<'starter' | 'app', Record<string, unknown>>>
    tests: Record<string, { project: 'starter' | 'app'; result: unknown }>
  } = existing
    ? structuredClone(existing)
    : { framework, projects: {}, tests: {} }
  if (combined.framework !== framework)
    throw new Error('Cannot merge different frameworks')
  combined.projects[project] = Object.fromEntries(
    Object.entries(stats).filter(([key]) => metadataKeys.has(key)),
  )
  for (const [name, test] of Object.entries(combined.tests))
    if (test.project === project) delete combined.tests[name]
  for (const [name, result] of Object.entries(stats))
    if (!metadataKeys.has(name) && result !== undefined) {
      if (combined.tests[name] && combined.tests[name].project !== project)
        throw new Error(`Test name collision: ${name}`)
      combined.tests[name] = { project, result }
    }
  return CombinedResultSchema.parse(combined)
}
export function saveProjectResult(
  packageName: string,
  stats: Record<string, unknown>,
  root = resultsRoot,
) {
  const { framework } = resultLocation(packageName)
  const version =
    typeof stats.frameworkVersion === 'string' &&
    stats.frameworkVersion !== 'unknown'
      ? stats.frameworkVersion
      : undefined
  for (const path of [
    resultPath(framework, undefined, root),
    ...(version ? [resultPath(framework, version, root)] : []),
  ]) {
    let existing: CombinedResult | null = null
    try {
      existing = CombinedResultSchema.parse(
        JSON.parse(readFileSync(path, 'utf8')),
      )
    } catch (error) {
      if (!(
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ))
        throw error
    }
    const result = mergeProjectResult(existing, packageName, stats)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify(result, null, 2) + '\n')
  }
}
