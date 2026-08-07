import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { relative, join } from 'node:path'
import { getFrameworks } from './get-frameworks.ts'
import { packagesDir } from './constants.ts'
import { getFrameworkDependencyName } from './utils.ts'
import type {
  FrameworkConfig,
  MeasurementConfig,
  MeasurementType,
  TestConfig,
} from './types.ts'

const benchmarkTypes = [
  'install',
  'build',
  'ssrRequestThroughput',
  'ssrLoad',
  'clientSideRendered',
  'serverSideRendered',
] as const satisfies readonly MeasurementType[]

type BenchmarkType = (typeof benchmarkTypes)[number]

interface CliOptions {
  selectors: string[]
  measurements: BenchmarkType[]
  runs?: number
  version?: string
  all: boolean
  dryRun: boolean
  list: boolean
  skipInstall: boolean
}

interface BenchmarkTarget {
  framework: FrameworkConfig
  testConfig: TestConfig
  measurements: MeasurementConfig[]
}

interface Command {
  description: string
  executable: string
  args: string[]
  cwd: string
}

interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

interface VersionOverride {
  packageName: string
  dependencyName: string
  requestedSpecifier: string
  packageJsonPath: string
  packageJsonContent: string
  overriddenPackageJsonContent: string
  lockfilePath: string
  lockfileContent?: string
  workspaceConfigPath: string
  workspaceConfigContent?: string
  overriddenWorkspaceConfigContent: string
  hadNodeModules: boolean
  restoreNodeModules: boolean
}

const rootDir = join(packagesDir, '..')
const benchmarkTypeSet = new Set<string>(benchmarkTypes)

const scriptByBenchmark = {
  install: 'run:install',
  build: 'run:build',
  ssrRequestThroughput: 'run:ssr-request-throughput',
  ssrLoad: 'run:ssr-load',
  clientSideRendered: 'run:client-side-rendered',
  serverSideRendered: 'run:server-side-rendered',
} as const satisfies Record<BenchmarkType, string>

function printUsage(): void {
  console.info(`Run benchmarks for one or more frameworks or packages.

Usage:
  pnpm benchmark <selector...> [options]
  pnpm benchmark --all [options]

Selectors:
  A framework name (for example "astro") selects its starter and app packages.
  A package name (for example "app-astro") selects only that package.

Options:
  -m, --measurement <types>  Comma-separated benchmark types; repeatable
  -r, --runs <count>         Override runs for repeated benchmarks
  -v, --version <version>    Temporarily use this framework version
      --all                  Select every configured framework
      --skip-install         Reuse package dependencies already installed
      --dry-run              Print the commands without running them
      --list                 List configured benchmarks
  -h, --help                 Show this help

Benchmark types:
  ${benchmarkTypes.join(', ')}

Examples:
  pnpm benchmark astro next --measurement ssrLoad
  pnpm benchmark next --version 15.5.9 -m ssrLoad
  pnpm benchmark app-astro app-sveltekit -m clientSideRendered -r 3
  pnpm benchmark astro -m install,build --runs 1
  pnpm benchmark --all -m ssrRequestThroughput --dry-run`)
}

function splitValues(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

function readOptionValue(
  args: string[],
  index: number,
  option: string,
): string {
  const value = args[index + 1]
  if (!value || value.startsWith('-')) {
    throw new Error(`${option} requires a value`)
  }
  return value
}

function parseBenchmarkTypes(value: string): BenchmarkType[] {
  return splitValues(value).map((type) => {
    if (!benchmarkTypeSet.has(type)) {
      throw new Error(
        `Unknown benchmark type "${type}". Expected one of: ${benchmarkTypes.join(', ')}`,
      )
    }
    return type as BenchmarkType
  })
}

function parseArgs(args: string[]): CliOptions | null {
  const options: CliOptions = {
    selectors: [],
    measurements: [],
    all: false,
    dryRun: false,
    list: false,
    skipInstall: false,
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === '--help' || arg === '-h') {
      return null
    }
    if (arg === '--all') {
      options.all = true
      continue
    }
    if (arg === '--dry-run') {
      options.dryRun = true
      continue
    }
    if (arg === '--list') {
      options.list = true
      continue
    }
    if (arg === '--skip-install') {
      options.skipInstall = true
      continue
    }
    if (arg === '--measurement' || arg === '--measurements' || arg === '-m') {
      const value = readOptionValue(args, index, arg)
      options.measurements.push(...parseBenchmarkTypes(value))
      index += 1
      continue
    }
    if (arg.startsWith('--measurement=')) {
      options.measurements.push(
        ...parseBenchmarkTypes(arg.slice('--measurement='.length)),
      )
      continue
    }
    if (arg.startsWith('--measurements=')) {
      options.measurements.push(
        ...parseBenchmarkTypes(arg.slice('--measurements='.length)),
      )
      continue
    }
    if (arg === '--runs' || arg === '-r') {
      const value = readOptionValue(args, index, arg)
      options.runs = Number(value)
      index += 1
      continue
    }
    if (arg === '--version' || arg === '-v') {
      options.version = readOptionValue(args, index, arg)
      index += 1
      continue
    }
    if (arg.startsWith('--version=')) {
      options.version = arg.slice('--version='.length)
      continue
    }
    if (arg.startsWith('--runs=')) {
      options.runs = Number(arg.slice('--runs='.length))
      continue
    }
    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`)
    }

    options.selectors.push(...splitValues(arg))
  }

  options.measurements = [...new Set(options.measurements)]

  if (
    options.runs !== undefined &&
    (!Number.isInteger(options.runs) || options.runs < 1)
  ) {
    throw new Error('--runs must be a positive integer')
  }
  if (options.all && options.selectors.length > 0) {
    throw new Error('Use either selectors or --all, not both')
  }
  if (options.version !== undefined && options.version.length === 0) {
    throw new Error('--version requires a non-empty value')
  }
  if (options.version !== undefined && options.skipInstall) {
    throw new Error('--version cannot be combined with --skip-install')
  }

  return options
}

function configuredBenchmarks(testConfig: TestConfig): MeasurementConfig[] {
  return testConfig.measurements.filter((measurement) =>
    benchmarkTypeSet.has(measurement.type),
  )
}

function listBenchmarks(frameworks: FrameworkConfig[]): void {
  for (const framework of frameworks) {
    console.info(`${framework.name} (${framework.displayName})`)
    for (const testConfig of [framework.starter, framework.app]) {
      if (!testConfig) {
        continue
      }
      const measurements = configuredBenchmarks(testConfig)
      if (measurements.length > 0) {
        console.info(
          `  ${testConfig.package}: ${measurements.map(({ type }) => type).join(', ')}`,
        )
      }
    }
  }
}

function selectTargets(
  frameworks: FrameworkConfig[],
  options: CliOptions,
): BenchmarkTarget[] {
  const selectedPackages = new Set<string>()

  if (options.all) {
    for (const framework of frameworks) {
      if (framework.starter) {
        selectedPackages.add(framework.starter.package)
      }
      if (framework.app) {
        selectedPackages.add(framework.app.package)
      }
    }
  } else {
    for (const selector of options.selectors) {
      const framework = frameworks.find(({ name }) => name === selector)
      if (framework) {
        if (framework.starter) {
          selectedPackages.add(framework.starter.package)
        }
        if (framework.app) {
          selectedPackages.add(framework.app.package)
        }
        continue
      }

      const packageExists = frameworks.some(
        ({ starter, app }) =>
          starter?.package === selector || app?.package === selector,
      )
      if (!packageExists) {
        throw new Error(
          `Unknown selector "${selector}". Run "pnpm benchmark --list" to see available names.`,
        )
      }
      selectedPackages.add(selector)
    }
  }

  const requestedMeasurements = new Set(options.measurements)
  const targets: BenchmarkTarget[] = []

  for (const framework of frameworks) {
    for (const testConfig of [framework.starter, framework.app]) {
      if (!testConfig || !selectedPackages.has(testConfig.package)) {
        continue
      }

      const measurements = configuredBenchmarks(testConfig).filter(
        ({ type }) =>
          requestedMeasurements.size === 0 ||
          requestedMeasurements.has(type as BenchmarkType),
      )
      if (measurements.length > 0) {
        targets.push({ framework, testConfig, measurements })
      }
    }
  }

  if (options.measurements.length > 0) {
    const matchedMeasurements = new Set(
      targets.flatMap(({ measurements }) =>
        measurements.map(({ type }) => type),
      ),
    )
    const unmatched = options.measurements.filter(
      (measurement) => !matchedMeasurements.has(measurement),
    )
    if (unmatched.length > 0) {
      throw new Error(
        `The selected packages do not configure: ${unmatched.join(', ')}`,
      )
    }
  }

  if (targets.length === 0) {
    throw new Error('No configured benchmarks matched the selection')
  }

  return targets
}

function getVersionSpecifier(
  frameworkPackage: string,
  version: string,
): string {
  if (frameworkPackage.startsWith('jsr:') && !version.startsWith('jsr:')) {
    return `jsr:${version}`
  }
  return version
}

function addMinimumReleaseAgeExclude(
  content: string,
  dependencyName: string,
): string {
  const lines = content.trimEnd().split(/\r?\n/)
  const settingIndex = lines.findIndex(
    (line) => line.trim() === 'minimumReleaseAgeExclude:',
  )

  if (settingIndex === -1) {
    lines.push(
      '',
      'minimumReleaseAgeExclude:',
      `  - ${JSON.stringify(dependencyName)}`,
    )
    return `${lines.join('\n')}\n`
  }

  let insertionIndex = settingIndex + 1
  while (
    insertionIndex < lines.length &&
    (lines[insertionIndex].trim() === '' || /^\s/.test(lines[insertionIndex]))
  ) {
    const configuredPackage = lines[insertionIndex]
      .trim()
      .replace(/^-\s*/, '')
      .replace(/^['"]|['"]$/g, '')
    if (configuredPackage === dependencyName) {
      return `${lines.join('\n')}\n`
    }
    insertionIndex += 1
  }

  lines.splice(insertionIndex, 0, `  - ${JSON.stringify(dependencyName)}`)
  return `${lines.join('\n')}\n`
}

function getMinimumReleaseAgeExcludes(dependencyName: string): string[] {
  if (dependencyName === 'next') {
    return [dependencyName, '@next/*']
  }
  if (dependencyName.startsWith('@')) {
    return [dependencyName, `${dependencyName.split('/')[0]}/*`]
  }
  return [dependencyName]
}

function prepareVersionOverrides(
  targets: BenchmarkTarget[],
  version: string,
): VersionOverride[] {
  const selectedFrameworks = new Map(
    targets.map(({ framework }) => [framework.name, framework]),
  )
  if (selectedFrameworks.size !== 1) {
    throw new Error(
      '--version requires packages from exactly one framework; select exact packages or run frameworks separately',
    )
  }

  const framework = [...selectedFrameworks.values()][0]
  if (framework.frameworkPackage === 'node') {
    throw new Error(
      `${framework.displayName} uses the Node.js runtime and does not have an installable framework version`,
    )
  }

  const dependencyName = getFrameworkDependencyName(framework.frameworkPackage)
  const requestedSpecifier = getVersionSpecifier(
    framework.frameworkPackage,
    version,
  )

  return targets.map(({ testConfig, measurements }) => {
    const packageDir = join(packagesDir, testConfig.package)
    const packageJsonPath = join(packageDir, 'package.json')
    const lockfilePath = join(packageDir, 'pnpm-lock.yaml')
    const workspaceConfigPath = join(packageDir, 'pnpm-workspace.yaml')
    const packageJsonContent = readFileSync(packageJsonPath, 'utf-8')
    const packageJson = JSON.parse(packageJsonContent) as PackageJson
    const dependencySection = packageJson.dependencies?.[dependencyName]
      ? packageJson.dependencies
      : packageJson.devDependencies?.[dependencyName]
        ? packageJson.devDependencies
        : undefined

    if (!dependencySection) {
      throw new Error(
        `Framework dependency "${dependencyName}" was not found in ${testConfig.package}/package.json`,
      )
    }

    dependencySection[dependencyName] = requestedSpecifier
    const workspaceConfigContent = existsSync(workspaceConfigPath)
      ? readFileSync(workspaceConfigPath, 'utf-8')
      : undefined

    return {
      packageName: testConfig.package,
      dependencyName,
      requestedSpecifier,
      packageJsonPath,
      packageJsonContent,
      overriddenPackageJsonContent: `${JSON.stringify(packageJson, null, 2)}\n`,
      lockfilePath,
      lockfileContent: existsSync(lockfilePath)
        ? readFileSync(lockfilePath, 'utf-8')
        : undefined,
      workspaceConfigPath,
      workspaceConfigContent,
      overriddenWorkspaceConfigContent: getMinimumReleaseAgeExcludes(
        dependencyName,
      ).reduce(
        (content, packageName) =>
          addMinimumReleaseAgeExclude(content, packageName),
        workspaceConfigContent ?? 'packages:\n  - .\n',
      ),
      hadNodeModules: existsSync(join(packageDir, 'node_modules')),
      restoreNodeModules: measurements.some(({ type }) => type !== 'install'),
    }
  })
}

function applyVersionOverrides(overrides: VersionOverride[]): void {
  for (const override of overrides) {
    console.info(
      `Using ${override.dependencyName}@${override.requestedSpecifier} in ${override.packageName}`,
    )
    writeFileSync(
      override.packageJsonPath,
      override.overriddenPackageJsonContent,
    )
    writeFileSync(
      override.workspaceConfigPath,
      override.overriddenWorkspaceConfigContent,
    )
  }
}

function restoreVersionOverrides(overrides: VersionOverride[]): string[] {
  const errors: string[] = []

  for (const override of overrides) {
    try {
      writeFileSync(override.packageJsonPath, override.packageJsonContent)
      if (override.lockfileContent === undefined) {
        rmSync(override.lockfilePath, { force: true })
      } else {
        writeFileSync(override.lockfilePath, override.lockfileContent)
      }
      if (override.workspaceConfigContent === undefined) {
        rmSync(override.workspaceConfigPath, { force: true })
      } else {
        writeFileSync(
          override.workspaceConfigPath,
          override.workspaceConfigContent,
        )
      }
    } catch (error) {
      errors.push(
        `Could not restore files for ${override.packageName}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  for (const override of overrides) {
    if (!override.restoreNodeModules) {
      continue
    }

    const packageDir = join(packagesDir, override.packageName)
    try {
      if (override.hadNodeModules) {
        console.info(
          `Restoring dependencies for ${override.packageName} from its lockfile...`,
        )
        execFileSync('pnpm', ['install', '--frozen-lockfile'], {
          cwd: packageDir,
          stdio: 'inherit',
          env: process.env,
        })
      } else {
        rmSync(join(packageDir, 'node_modules'), {
          recursive: true,
          force: true,
        })
      }
    } catch (error) {
      errors.push(
        `Could not restore dependencies for ${override.packageName}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  return errors
}

function benchmarkCommand(
  packageName: string,
  measurement: MeasurementConfig,
  runs?: number,
): Command {
  const type = measurement.type as BenchmarkType
  const args = [
    '--filter',
    '@framework-tracker/stats-generator',
    scriptByBenchmark[type],
    packageName,
  ]
  const repeatedBenchmark =
    type === 'install' ||
    type === 'build' ||
    type === 'clientSideRendered' ||
    type === 'serverSideRendered'
  const runCount = runs ?? measurement.runFrequency

  if (repeatedBenchmark && runCount !== undefined) {
    args.push(String(runCount))
  }

  return {
    description: `Run ${type} for ${packageName}`,
    executable: 'pnpm',
    args,
    cwd: rootDir,
  }
}

function buildCommands(
  targets: BenchmarkTarget[],
  options: CliOptions,
): Command[] {
  const commands: Command[] = []

  for (const { testConfig, measurements } of targets) {
    const packageDir = join(packagesDir, testConfig.package)
    let hasPackageDependencies = options.skipInstall
    let hasBuildOutput = false
    for (const measurement of measurements) {
      const type = measurement.type as BenchmarkType
      if (type !== 'install' && !hasPackageDependencies) {
        commands.push({
          description: `Install dependencies for ${testConfig.package}`,
          executable: 'pnpm',
          args: [
            'install',
            options.version ? '--no-frozen-lockfile' : '--frozen-lockfile',
          ],
          cwd: packageDir,
        })
        hasPackageDependencies = true
      }

      const needsBuildOutput =
        type === 'ssrRequestThroughput' ||
        type === 'ssrLoad' ||
        type === 'clientSideRendered' ||
        type === 'serverSideRendered'

      if (needsBuildOutput && !hasBuildOutput) {
        commands.push({
          description: `Build ${testConfig.package}`,
          executable: 'pnpm',
          args: ['run', testConfig.buildScript],
          cwd: packageDir,
        })
        hasBuildOutput = true
      }

      commands.push(
        benchmarkCommand(testConfig.package, measurement, options.runs),
      )
      if (type === 'build') {
        hasBuildOutput = true
      }
    }
  }

  return commands
}

function quoteArg(arg: string): string {
  return /^[a-zA-Z0-9_./:@=-]+$/.test(arg)
    ? arg
    : `'${arg.replaceAll("'", "'\\''")}'`
}

function printCommands(commands: Command[]): void {
  console.info(`Benchmark plan (${commands.length} commands):`)
  for (const [index, command] of commands.entries()) {
    const cwd = relative(rootDir, command.cwd) || '.'
    const invocation = [command.executable, ...command.args]
      .map(quoteArg)
      .join(' ')
    console.info(`${index + 1}. ${command.description}`)
    console.info(`   (${cwd}) ${invocation}`)
  }
}

function runCommands(commands: Command[]): void {
  for (const [index, command] of commands.entries()) {
    console.info(`\n[${index + 1}/${commands.length}] ${command.description}\n`)
    execFileSync(command.executable, command.args, {
      cwd: command.cwd,
      stdio: 'inherit',
      env: process.env,
    })
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))
  if (!options) {
    printUsage()
    return
  }

  const frameworks = await getFrameworks()
  if (options.list) {
    listBenchmarks(frameworks)
    return
  }
  if (!options.all && options.selectors.length === 0) {
    printUsage()
    throw new Error('Select at least one framework or package, or use --all')
  }

  const targets = selectTargets(frameworks, options)
  const versionOverrides = options.version
    ? prepareVersionOverrides(targets, options.version)
    : []
  const commands = buildCommands(targets, options)
  if (versionOverrides.length > 0) {
    console.info(
      `Temporary version override: ${versionOverrides[0].dependencyName}@${versionOverrides[0].requestedSpecifier}`,
    )
  }
  printCommands(commands)

  if (options.dryRun) {
    console.info('\nDry run complete; no commands were executed.')
    return
  }

  let benchmarkError: unknown
  let cleanupErrors: string[] = []
  try {
    applyVersionOverrides(versionOverrides)
    runCommands(commands)
  } catch (error) {
    benchmarkError = error
  } finally {
    cleanupErrors = restoreVersionOverrides(versionOverrides)
  }

  if (benchmarkError) {
    const benchmarkMessage =
      benchmarkError instanceof Error
        ? benchmarkError.message
        : String(benchmarkError)
    const cleanupMessage =
      cleanupErrors.length > 0
        ? `\nCleanup also failed:\n${cleanupErrors.join('\n')}`
        : ''
    throw new Error(`${benchmarkMessage}${cleanupMessage}`)
  }
  if (cleanupErrors.length > 0) {
    throw new Error(cleanupErrors.join('\n'))
  }
  console.info('\n✓ All selected benchmarks completed')
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
