/** Shared colours for server-rendered legends and client-rendered marks. */
const frameworkColors: Record<string, string> = {
  'Baseline HTML': '#94a3b8',
  Astro: '#bc4be9',
  Pracht: '#ffbf16',
  Nuxt: '#00c996',
  SvelteKit: '#ff4b19',
  SolidStart: '#00b5ed',
  'React Router': '#d13e47',
  'TanStack Start': '#ff9750',
}

export function getFrameworkColor(name: string) {
  return frameworkColors[name] ?? 'var(--ft-text, #697586)'
}

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
