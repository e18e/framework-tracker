import { getBrandByPackage } from './framework-logos.ts'
import type {
  ChartMeasurement,
  MetricDefinition,
  MonthlyComparisonChartPayload,
  MonthlyComparisonSeries,
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

export function monthlyComparison<T extends ChartMeasurement>(
  metric: MetricDefinition,
  history: readonly T[],
  latest: readonly T[],
  getValue: (record: T) => number | null,
  now = new Date(),
): MonthlyComparisonChartPayload {
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

  const series = [...packages].map((packageName): MonthlyComparisonSeries => {
    const versions = byPackage.get(packageName) ?? []
    const current = latestByPackage.get(packageName)
    const identity = current ?? versions[0]!
    const baseline = packageName === BASELINE_PACKAGE
    return {
      id: packageName,
      name: identity.name ?? packageName,
      focused: baseline || identity.isFocused !== false,
      baseline,
      color: baseline ? null : (getBrandByPackage(packageName)?.color ?? null),
      points: [
        ...monthStarts.map((date) => {
          const record = selectVersionAt(versions, date)
          return {
            month: toMonthKey(date),
            value: record ? getValue(record) : null,
            version: record?.frameworkVersion ?? null,
          }
        }),
        {
          month: LATEST_POINT,
          value: current ? getValue(current) : null,
          version: current?.frameworkVersion ?? null,
        },
      ],
    }
  })

  return {
    ...metric,
    id: `${metric.id}-monthly`,
    months: [...monthStarts.map(toMonthKey), LATEST_POINT],
    series: series
      .filter((s) => s.points.some((point) => point.value != null))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }
}
