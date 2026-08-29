import { join } from 'node:path'
import { readdirSync, existsSync } from 'node:fs'
import { z } from 'zod'
import { getFrameworks } from './get-frameworks.ts'
import { packagesDir } from './constants.ts'
import { readJsonFile } from './utils.ts'
import { StarterCIStatsSchema, AppCIStatsSchema } from './schemas.ts'

function validateFile(filePath: string, schema: z.ZodSchema): string[] {
  const data = readJsonFile(filePath)
  if (!data) {
    return [`File not found or unparseable: ${filePath}`]
  }

  const result = schema.safeParse(data)
  if (result.success) {
    return []
  }

  return result.error.issues.map(
    (issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`,
  )
}

function findJsonFilesInDir(dir: string): string[] {
  if (!existsSync(dir)) return []
  const files: string[] = []
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...findJsonFilesInDir(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath)
    }
  }
  return files
}

async function main() {
  console.info('=== Validating Generated Stats JSON Files ===\n')

  const frameworks = await getFrameworks()
  let hasFailures = false
  let totalFilesChecked = 0

  for (const framework of frameworks) {
    if (framework.starter) {
      const pkg = framework.starter.package
      const starterDir = join(packagesDir, pkg)
      console.info(`Validating ${framework.displayName} starter (${pkg})...`)

      const jsonFiles: string[] = []
      const ciStats = join(starterDir, 'ci-stats.json')
      if (existsSync(ciStats)) jsonFiles.push(ciStats)

      const statsDir = join(starterDir, 'stats')
      if (existsSync(statsDir)) {
        jsonFiles.push(...findJsonFilesInDir(statsDir))
      }

      for (const filePath of jsonFiles) {
        totalFilesChecked++
        const errors = validateFile(filePath, StarterCIStatsSchema)
        if (errors.length > 0) {
          console.error(`  ✗ ${filePath}`)
          errors.forEach((e) => console.error(`    ${e}`))
          hasFailures = true
        } else {
          console.info(`  ✓ ${filePath}`)
        }
      }
      console.info('')
    }

    if (framework.app) {
      const pkg = framework.app.package
      const appDir = join(packagesDir, pkg)
      console.info(`Validating ${framework.displayName} app (${pkg})...`)

      const jsonFiles: string[] = []
      const ciStats = join(appDir, 'ci-stats.json')
      if (existsSync(ciStats)) jsonFiles.push(ciStats)

      const statsDir = join(appDir, 'stats')
      if (existsSync(statsDir)) {
        jsonFiles.push(...findJsonFilesInDir(statsDir))
      }

      for (const filePath of jsonFiles) {
        totalFilesChecked++
        const errors = validateFile(filePath, AppCIStatsSchema)
        if (errors.length > 0) {
          console.error(`  ✗ ${filePath}`)
          errors.forEach((e) => console.error(`    ${e}`))
          hasFailures = true
        } else {
          console.info(`  ✓ ${filePath}`)
        }
      }
      console.info('')
    }
  }

  // Validate Docs Devtime & Runtime JSON files
  const docsDevtimeDir = join(packagesDir, 'docs', 'src', 'content', 'devtime')
  if (existsSync(docsDevtimeDir)) {
    console.info('Validating docs devtime content JSON files...')
    const devtimeFiles = findJsonFilesInDir(docsDevtimeDir)
    for (const filePath of devtimeFiles) {
      totalFilesChecked++
      const errors = validateFile(filePath, StarterCIStatsSchema)
      if (errors.length > 0) {
        console.error(`  ✗ ${filePath}`)
        errors.forEach((e) => console.error(`    ${e}`))
        hasFailures = true
      } else {
        console.info(`  ✓ ${filePath}`)
      }
    }
    console.info('')
  }

  const docsRuntimeDir = join(packagesDir, 'docs', 'src', 'content', 'runtime')
  if (existsSync(docsRuntimeDir)) {
    console.info('Validating docs runtime content JSON files...')
    const runtimeFiles = findJsonFilesInDir(docsRuntimeDir)
    for (const filePath of runtimeFiles) {
      totalFilesChecked++
      const errors = validateFile(filePath, AppCIStatsSchema)
      if (errors.length > 0) {
        console.error(`  ✗ ${filePath}`)
        errors.forEach((e) => console.error(`    ${e}`))
        hasFailures = true
      } else {
        console.info(`  ✓ ${filePath}`)
      }
    }
    console.info('')
  }

  if (hasFailures) {
    console.error(
      `Validation failed! Some JSON stats files contain invalid or missing data.`,
    )
    process.exit(1)
  }

  console.info(
    `✓ Successfully validated all ${totalFilesChecked} JSON stats files!`,
  )
}

main().catch((error) => {
  console.error('Validation error:', error)
  process.exit(1)
})
