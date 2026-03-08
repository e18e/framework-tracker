export interface ChartDatum {
  name: string
  value: number
  focused?: boolean
}

export interface ComparisonChartPayload {
  data: ChartDatum[]
  valueFormat: 'count' | 'mb' | 'kb' | 'ms' | 's'
}
