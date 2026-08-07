import { join } from 'node:path'
import { packagesDir } from './constants.ts'
import {
  getFrameworkDependencyCountsFromPackageMetadata,
  getFrameworkByPackage,
  parseArgs,
  writeJsonFile,
} from './utils.ts'

async function main() {
  const { packageName, args } = parseArgs(
    'Usage: run-framework-dependency-scan <starter-package> [output-path]\nExample: run-framework-dependency-scan starter-astro',
  )
  const [requestedOutputPath] = args
  const { framework } = await getFrameworkByPackage(packageName)

  const outputPath =
    requestedOutputPath ??
    join(packagesDir, packageName, 'framework-dependency-stats.json')
  const stats = getFrameworkDependencyCountsFromPackageMetadata(
    packageName,
    framework.frameworkPackage,
  )

  writeJsonFile(outputPath, stats)
  console.info(`Saved framework dependency stats to ${outputPath}`)
}

main().catch((error) => {
  console.error('Framework dependency scan failed:', error)
  process.exit(1)
})
