#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const T975 = [
  12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201,
  2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074,
  2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042,
]

function tCritical975(df) {
  if (df < 1) return Infinity
  if (df <= 30) return T975[df - 1]
  return 1.96 + 2.4 / df
}

function tTestP(values) {
  const count = values.length
  if (count < 2 || values.some((value) => !Number.isFinite(value))) return 1
  const mean = values.reduce((sum, value) => sum + value, 0) / count
  const standardDeviation = Math.sqrt(
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (count - 1),
  )
  if (standardDeviation === 0) return mean === 0 ? 1 : 0
  const t = Math.abs(mean / (standardDeviation / Math.sqrt(count)))
  const degrees = count - 1
  if (degrees === 1) {
    return Math.min(1, Math.max(0, 1 - (2 / Math.PI) * Math.atan(t)))
  }
  if (!Number.isFinite(t) || t > 45) return 0
  const pdf = (value) =>
    Math.exp(-((degrees + 1) / 2) * Math.log(1 + (value * value) / degrees))
  let tail = 0
  let normalizer = 0
  const step = 0.001
  for (let value = t; value < t + 60; value += step) {
    tail += pdf(value + step / 2) * step
  }
  for (let value = 0; value < 80; value += step) {
    normalizer += pdf(value + step / 2) * step
  }
  return Math.min(1, tail / normalizer)
}

function stats(values) {
  if (values.length === 0) return undefined
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  if (values.length === 1) {
    return { mean, ci95: Infinity, p: 1, count: 1 }
  }
  const standardDeviation = Math.sqrt(
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
      (values.length - 1),
  )
  return {
    mean,
    ci95:
      (tCritical975(values.length - 1) * standardDeviation) /
      Math.sqrt(values.length),
    p: tTestP(values),
    count: values.length,
  }
}

function walk(directory) {
  const files = []
  if (!fs.existsSync(directory)) return files
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...walk(file))
    else files.push(file)
  }
  return files
}

function flattenNumbers(value, prefix = '', output = {}) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    output[prefix] = value
    return output
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return output
  for (const [key, child] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key
    if (next === 'ssrLoadTests.stages') continue
    flattenNumbers(child, next, output)
  }
  return output
}

function packageRole(packageName) {
  if (packageName.startsWith('app-')) return 'app'
  if (packageName.startsWith('starter-')) return 'starter'
  return packageName
}

function formatNumber(value) {
  const absolute = Math.abs(value)
  if (absolute >= 1000000) return value.toFixed(0)
  if (absolute >= 1000) return value.toFixed(1)
  if (absolute >= 10) return value.toFixed(2)
  return value.toFixed(3)
}

function formatP(value) {
  if (value < 0.0001) return '<0.0001'
  return value.toFixed(4)
}

function parseSamples(runDir, meta) {
  const caseLabels = new Map(
    meta.plan.cases.map((testCase) => [testCase.id, testCase.label]),
  )
  const samples = []
  for (const file of walk(runDir)) {
    if (!file.endsWith('.json')) continue
    const relative = path.relative(runDir, file)
    const match = relative.match(
      /^vm-(\d+)\/bench-output\/block-(\d+)\/(case-[^/]+)\/packages\/([^/]+)\/(ci-stats|install-stats|build-stats)\.json$/,
    )
    if (!match) continue
    const [, vm, block, caseId, packageName, fileType] = match
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    for (const [metric, value] of Object.entries(flattenNumbers(data))) {
      samples.push({
        vm: Number(vm),
        block: Number(block),
        caseId,
        caseLabel: caseLabels.get(caseId) ?? caseId,
        packageName,
        key: `${packageRole(packageName)}/${fileType}:${metric}`,
        value,
      })
    }
  }
  return samples
}

function bootMeans(samples) {
  const grouped = new Map()
  for (const sample of samples) {
    const key = `${sample.caseId}\0${sample.key}\0${sample.vm}`
    const values = grouped.get(key) ?? []
    values.push(sample.value)
    grouped.set(key, values)
  }
  const means = new Map()
  for (const [key, values] of grouped) {
    means.set(
      key,
      values.reduce((sum, value) => sum + value, 0) / values.length,
    )
  }
  return means
}

function summarizeAbsolute(samples, means, cases) {
  const lines = [
    '## Boot-level means',
    '',
    '| case | metric | mean | 95% CI | boots |',
    '|---|---|---:|---:|---:|',
  ]
  const metrics = [...new Set(samples.map((sample) => sample.key))].sort()
  for (const testCase of cases) {
    for (const metric of metrics) {
      const values = []
      const seenVms = new Set()
      for (const sample of samples) {
        if (sample.caseId !== testCase.id || sample.key !== metric) continue
        if (seenVms.has(sample.vm)) continue
        const value = means.get(`${testCase.id}\0${metric}\0${sample.vm}`)
        if (value !== undefined) {
          seenVms.add(sample.vm)
          values.push(value)
        }
      }
      const result = stats(values)
      if (!result) continue
      lines.push(
        `| ${testCase.label} | \`${metric}\` | ${formatNumber(result.mean)} | ${
          result.ci95 === Infinity ? 'n/a' : `±${formatNumber(result.ci95)}`
        } | ${result.count} |`,
      )
    }
  }
  return lines
}

function summarizeComparisons(samples, means, cases) {
  if (cases.length < 2) return []
  const base = cases[0]
  const lines = [
    '',
    `## Paired comparisons against ${base.label}`,
    '',
    'Positive deltas mean the candidate produced a larger numeric value. The VM boot is the unit of replication.',
    '',
    '| candidate | metric | delta | 95% CI | p | boots |',
    '|---|---|---:|---:|---:|---:|',
  ]
  const metrics = [...new Set(samples.map((sample) => sample.key))].sort()
  const vmIds = [...new Set(samples.map((sample) => sample.vm))].sort(
    (left, right) => left - right,
  )

  for (const candidate of cases.slice(1)) {
    for (const metric of metrics) {
      const deltas = []
      for (const vm of vmIds) {
        const baseValue = means.get(`${base.id}\0${metric}\0${vm}`)
        const candidateValue = means.get(`${candidate.id}\0${metric}\0${vm}`)
        if (
          baseValue === undefined ||
          candidateValue === undefined ||
          baseValue === 0
        ) {
          continue
        }
        deltas.push((candidateValue - baseValue) / Math.abs(baseValue))
      }
      const result = stats(deltas)
      if (!result) continue
      lines.push(
        `| ${candidate.label} | \`${metric}\` | ${(result.mean * 100).toFixed(2)}% | ${
          result.ci95 === Infinity
            ? 'n/a'
            : `±${(result.ci95 * 100).toFixed(2)}%`
        } | ${formatP(result.p)} | ${result.count} |`,
      )
    }
  }
  return lines
}

function main() {
  const runDir = process.argv[2]
  if (!runDir) {
    console.error('Usage: node summarize.mjs <run-directory>')
    process.exit(1)
  }
  const meta = JSON.parse(
    fs.readFileSync(path.join(runDir, 'meta.json'), 'utf8'),
  )
  const samples = parseSamples(runDir, meta)
  if (samples.length === 0) {
    throw new Error(`No benchmark result JSON files found in ${runDir}`)
  }
  const means = bootMeans(samples)
  const lines = [
    `# ${meta.runId}`,
    '',
    `Source: \`${meta.sourceHash}\`  `,
    `Snapshot: \`${meta.snapshot}\`  `,
    `Completed boots: ${Object.values(meta.vms).filter((vm) => vm.phase === 'done').length}`,
    '',
    ...summarizeAbsolute(samples, means, meta.plan.cases),
    ...summarizeComparisons(samples, means, meta.plan.cases),
    '',
    'Treat p-values as descriptive until this team/project has passed an A/A calibration. Confirm decision-driving findings with an independent run.',
    '',
  ]
  const output = `${lines.join('\n')}\n`
  fs.writeFileSync(path.join(runDir, 'summary.md'), output)
  console.log(output)
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
