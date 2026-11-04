/** Shared grid, line, and point styling for line charts. */
export function lineChartGrid() {
  const stroke =
    getComputedStyle(document.documentElement)
      .getPropertyValue('--ft-chart-grid')
      .trim() || '#d9dee7'
  return { stroke, strokeOpacity: 1 }
}

export const lineChartLineStyle = { strokeWidth: 3 }
export const lineChartPointStyle = { r: 4, strokeWidth: 3 }
export const lineChartLatestPointStyle = { ...lineChartPointStyle, r: 6 }
