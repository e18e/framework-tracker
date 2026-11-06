import { getBrandByPackage } from './framework-logos.ts'
import type {
  ChartMeasurement,
  MetricDefinition,
  LineComparisonChartPayload,
  LineComparisonSeries,
} from './types'

const MONTH_COUNT = 12
const BASELINE_PACKAGE = 'app-baseline-html'

function toMonthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export function getMonthStarts(now: Date, count = MONTH_COUNT) {
  return Array.from(
    { length: count },
    (_, index) =>
      new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - index)),
      ),
  )
}

export function selectVersionAt<T extends { releasedAt?: string }>(
  records: readonly T[],
  date: Date,
): T | undefined {
  let selected: T | undefined
  let selectedTime = -Infinity
  for (const record of records) {
    const time = record.releasedAt ? Date.parse(record.releasedAt) : NaN
    if (time <= date.getTime() && time > selectedTime) {
      selected = record
      selectedTime = time
    }
  }
  return selected
}

export const LATEST_POINT = 'latest'

/** Name, focus, baseline flag and brand colour shared by every line series. */
export function seriesIdentity(
  packageName: string,
  record: ChartMeasurement,
): Omit<LineComparisonSeries, 'points'> {
  const baseline = packageName === BASELINE_PACKAGE
  return {
    id: packageName,
    name: record.name ?? packageName,
    baseline,
    color: baseline ? null : (getBrandByPackage(packageName)?.color ?? null),
  }
}

export function monthlyComparison<T extends ChartMeasurement>(
  metric: MetricDefinition,
  history: readonly T[],
  latest: readonly T[],
  getValue: (record: T) => number | null,
  now = new Date(),
): LineComparisonChartPayload {
  const monthStarts = getMonthStarts(now)
  const byPackage = new Map<string, T[]>()
  for (const record of history) {
    if (record.package == null) continue
    byPackage.set(record.package, [
      ...(byPackage.get(record.package) ?? []),
      record,
    ])
  }
  const latestByPackage = new Map(
    latest.flatMap((record) =>
      record.package == null ? [] : [[record.package, record] as const],
    ),
  )
  const packages = new Set([...byPackage.keys(), ...latestByPackage.keys()])

  const series = [...packages].map((packageName): LineComparisonSeries => {
    const versions = byPackage.get(packageName) ?? []
    const current = latestByPackage.get(packageName)
    return {
      ...seriesIdentity(packageName, current ?? versions[0]!),
      points: [
        ...monthStarts.map((date) => {
          const record = selectVersionAt(versions, date)
          return {
            x: toMonthKey(date),
            value: record ? getValue(record) : null,
            version: record?.frameworkVersion ?? null,
          }
        }),
        {
          x: LATEST_POINT,
          value: current ? getValue(current) : null,
          version: current?.frameworkVersion ?? null,
        },
      ],
    }
  })

  return {
    ...metric,
    id: `${metric.id}-monthly`,
    xValues: [...monthStarts.map(toMonthKey), LATEST_POINT],
    scale: 'months',
    tooltip: 'compare',
    series: series
      .filter((s) => s.points.some((point) => point.value != null))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }
}
