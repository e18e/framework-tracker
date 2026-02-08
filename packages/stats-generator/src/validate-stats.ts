import { join } from 'node:path'
import { z } from 'zod'
import { getFrameworks } from './get-frameworks.ts'
import { packagesDir } from './constants.ts'
import { readJsonFile } from './utils.ts'
import {
  InstallStatsSchema,
  BuildStatsSchema,
  SSRStatsSchema,
} from './schemas.ts'

type BenchmarkType = 'install' | 'build' | 'ssr'

interface BenchmarkConfig {
  type: BenchmarkType
  file: string
  schema: z.ZodSchema
}

const STARTER_BENCHMARKS: BenchmarkConfig[] = [
  { type: 'install', file: 'install-stats.json', schema: InstallStatsSchema },
  { type: 'build', file: 'build-stats.json', schema: BuildStatsSchema },
]

const APP_BENCHMARKS: BenchmarkConfig[] = [
  { type: 'ssr', file: 'ci-stats.json', schema: SSRStatsSchema },
]

function validateFile(filePath: string, schema: z.ZodSchema): string[] {
  const data = readJsonFile(filePath)

  if (!data) {
    return [`File not found: ${filePath}`]
  }

  const result = schema.safeParse(data)
  if (result.success) {
    return []
  }

  return result.error.issues.map(
    (issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`,
  )
}

async function main() {
  const [target = 'all', filterType] = process.argv.slice(2)

  console.info('Validating stats output...\n')

  const frameworks = await getFrameworks()
  let hasFailures = false

  for (const framework of frameworks) {
    // Validate starter
    if (framework.starter) {
      const pkg = framework.starter.package
      if (target !== 'all' && target !== framework.name && target !== pkg)
        continue

      console.info(`Validating ${framework.displayName} starter (${pkg})...`)

      const errors: string[] = []
      for (const { type: benchType, file, schema } of STARTER_BENCHMARKS) {
        if (filterType && filterType !== benchType) continue

        const filePath = join(packagesDir, pkg, file)
        const fileErrors = validateFile(filePath, schema)
        errors.push(...fileErrors.map((e) => `[${benchType}] ${e}`))
      }

      if (errors.length === 0) {
        console.info('  ✓ Valid\n')
      } else {
        console.info('  ✗ Invalid')
        errors.forEach((e) => console.error(`    ${e}`))
        console.info('')
        hasFailures = true
      }
    }

    // Validate app
    if (framework.app) {
      const pkg = framework.app.package
      if (target !== 'all' && target !== framework.name && target !== pkg)
        continue

      console.info(`Validating ${framework.displayName} app (${pkg})...`)

      const errors: string[] = []
      for (const { type: benchType, file, schema } of APP_BENCHMARKS) {
        if (filterType && filterType !== benchType) continue

        const filePath = join(packagesDir, pkg, file)
        const fileErrors = validateFile(filePath, schema)
        errors.push(...fileErrors.map((e) => `[${benchType}] ${e}`))
      }

      if (errors.length === 0) {
        console.info('  ✓ Valid\n')
      } else {
        console.info('  ✗ Invalid')
        errors.forEach((e) => console.error(`    ${e}`))
        console.info('')
        hasFailures = true
      }
    }
  }

  if (hasFailures) {
    console.error('Validation failed!')
    process.exit(1)
  }

  console.info('✓ All validations passed!')
}

main().catch((error) => {
  console.error('Validation failed:', error)
  process.exit(1)
})
