export type ChartValueFormat = 'count' | 'mb' | 'kb' | 'ms' | 's'

export interface ChartDatum {
  name: string
  value: number
  focused?: boolean
}

export interface ComparisonChartPayload {
  data: ChartDatum[]
  valueFormat: ChartValueFormat
  yAxisLabel: string
}

export type VersionLineChartPayload = ComparisonChartPayload
