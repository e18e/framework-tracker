import { LATEST_POINT } from './monthly-history.ts'
import type { ChartTooltipOptions } from '@tanstack/charts'
import type { LineComparisonPoint } from './types'

export type LineChartRow = LineComparisonPoint & {
  name: string
  xPos: number
  y: number | null
}

export interface LineChartAxis {
  domain: [number, number]
  ticks?: number[]
  /** Round the domain out to tidy tick values. */
  nice?: boolean
  label?: string
  format: (tick: number) => string
}

export interface LineChartScaleConfig {
  label: string
  caption?: string
  formatX: (x: string) => string
  /** Plotted x position for a point. */
  getX: (x: string, xValues: readonly string[]) => number
  /** Plotted y position for a value, or null to leave a gap. */
  getY: (value: number) => number | null
  getXAxis: (xValues: readonly string[]) => LineChartAxis
  getYAxis: (
    ys: readonly number[],
    context: { label: string; format: (value: number) => string },
  ) => LineChartAxis
}

function formatMonth(month: string, withYear: boolean) {
  if (month === LATEST_POINT) return 'Latest'
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    year: withYear ? 'numeric' : undefined,
    timeZone: 'UTC',
  })
}

function logTicks(min: number, max: number) {
  const steps = max - min <= 2 ? [1, 2, 5] : [1]
  return Array.from({ length: max - min + 1 }, (_, i) => min + i).flatMap(
    (decade) =>
      steps
        .map((step) => decade + Math.log10(step))
        .filter((tick) => tick <= max),
  )
}

const months: LineChartScaleConfig = {
  label: 'Month',
  caption:
    'using the version current on the first of each month, then the latest results',
  formatX: (x) => formatMonth(x, true),
  getX: (x, xValues) => xValues.indexOf(x),
  getY: (value) => value,
  getXAxis: (xValues) => ({
    domain: [-0.3, xValues.length - 1 + 0.3],
    ticks: xValues.map((_, index) => index),
    format: (tick) => {
      const month = xValues[tick]!
      return formatMonth(month, tick === 0 || month.endsWith('-01'))
    },
  }),
  getYAxis: (ys, { format }) => {
    const max = Math.max(0, ...ys)
    return { domain: [0, max > 0 ? max * 1.1 : 1], nice: true, format }
  },
}

function exponential(options: {
  label: string
  formatX: (x: string) => string
}): LineChartScaleConfig {
  return {
    label: options.label,
    formatX: options.formatX,
    getX: Number,
    getY: (value) => (value > 0 ? Math.log10(value) : null),
    getXAxis: (xValues) => {
      const ticks = xValues.map(Number)
      return {
        domain: [Math.min(...ticks), Math.max(...ticks)],
        ticks,
        label: options.label,
        format: String,
      }
    },
    getYAxis: (ys, { label }) => {
      const min = Math.floor(Math.min(...ys))
      const max = Math.max(min + 1, Math.ceil(Math.max(...ys)))
      return {
        domain: [min, max],
        ticks: logTicks(min, max),
        label,
        format: (tick) =>
          (10 ** tick).toLocaleString('en-US', { maximumSignificantDigits: 3 }),
      }
    },
  }
}

export const lineChartScales = {
  months,
  connections: exponential({
    label: 'Connections',
    formatX: (x) => `${x} ${x === '1' ? 'connection' : 'connections'}`,
  }),
} satisfies Record<string, LineChartScaleConfig>

export type LineChartScaleId = keyof typeof lineChartScales

export interface LineChartTooltipConfig {
  focus: 'group-x' | 'nearest'
  /** Where the tooltip sits relative to the focused point. */
  position: Pick<ChartTooltipOptions, 'anchor' | 'placement' | 'offset'>
  content: (
    rows: readonly LineChartRow[],
    context: {
      scale: LineChartScaleConfig
      yAxisLabel: string
      format: (value: number) => string
      primary?: LineChartRow
    },
  ) => {
    title: string
    rows: { label: string; value: string; active?: boolean }[]
  }
}

const formatValue = (
  value: number | null,
  format: (value: number) => string,
) => (value == null ? '—' : format(value))

export const lineChartTooltips = {
  compare: {
    focus: 'group-x',
    // Beside the point, flipping sides near the plot edge
    position: { anchor: 'point', placement: ['right', 'left'], offset: 20 },
    content: (rows, { scale, format, primary }) => ({
      title: scale.formatX(rows[0]!.x),
      // Hovered series first; CSS draws the divider beneath it
      rows: [
        ...rows.filter((row) => row === primary),
        ...rows.filter((row) => row !== primary),
      ].map((row) => ({
        label: row.version ? `${row.name} v${row.version}` : row.name,
        value: formatValue(row.value, format),
        active: row === primary,
      })),
    }),
  },
  detail: {
    focus: 'nearest',
    // Beside the point, flipping sides near the plot edge
    position: { anchor: 'point', placement: ['right', 'left'], offset: 20 },
    content: ([row], { scale, yAxisLabel, format }) => ({
      title: row!.version ? `${row!.name} v${row!.version}` : row!.name,
      rows: [
        { label: scale.label, value: row!.x },
        { label: yAxisLabel, value: formatValue(row!.value, format) },
        ...(row!.range
          ? [
              { label: 'Min', value: format(row!.range.min) },
              { label: 'Median', value: format(row!.range.median) },
              { label: 'Max', value: format(row!.range.max) },
            ]
          : []),
      ],
    }),
  },
} satisfies Record<string, LineChartTooltipConfig>

export type LineChartTooltipId = keyof typeof lineChartTooltips
