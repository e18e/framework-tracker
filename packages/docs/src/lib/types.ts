export interface ChartDatum {
  name: string
  value: number
}

export interface ComparisonChartPayload {
  data: ChartDatum[]
  valueFormat: 'count' | 'mb'
}
