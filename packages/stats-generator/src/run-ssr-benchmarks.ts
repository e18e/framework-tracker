import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { runAllSSRBenchmarks } from './ssr/index.ts'
import { packagesDir } from './constants.ts'

async function runSSRBenchmarks() {
  console.info('Running SSR benchmarks...\n')

  const results = await runAllSSRBenchmarks()
  const timestamp = new Date().toISOString()

  console.info('\nSaving CI stats...\n')

  for (const result of results) {
    const ciStats = {
      timingMeasuredAt: timestamp,
      runner: process.env.RUNNER_NAME || 'local',
      ssrOpsPerSec: result.opsPerSec,
      ssrAvgLatencyMs: result.avgLatencyMs,
      ssrSamples: result.samples,
      ssrBodySizeKb: result.bodySizeKb,
      ssrDuplicationFactor: result.duplicationFactor,
    }

    const outputPath = join(packagesDir, result.package, '.ci-stats.json')
    await writeFile(outputPath, JSON.stringify(ciStats, null, 2), 'utf-8')

    console.info(`✓ Saved ${result.displayName} (${result.package})`)
  }

  console.info('Finished SSR benchmarks...\n')
}

runSSRBenchmarks().catch(console.error)
