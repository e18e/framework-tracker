import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import type { ComponentProps } from 'astro/types'
import ComparisonBarChart from '../ComparisonBarChart.astro'
import StatsTable from '../StatsTable.astro'
import { prepareNodeModulesSizeComparison } from '../../lib/chart-measurements'
import { frameworks } from './frameworks'

const MB = 1024 * 1024

const barChart = (): ComponentProps<typeof ComparisonBarChart> =>
  prepareNodeModulesSizeComparison(
    frameworks.map((framework) => ({
      ...framework,
      frameworkVersion: '1.0.0',
      install: {
        installTimeMs: { median: 1000 },
        nodeModulesSizeBytes: { value: framework.sizeMb * MB, unit: 'bytes' },
      },
    })),
  )

const statsTable = (): ComponentProps<typeof StatsTable> => ({
  label: 'Node modules size by framework',
  columns: [
    {
      key: 'name',
      header: 'Framework',
      nameCell: true,
      href: (row) =>
        row.package === 'app-baseline-html'
          ? null
          : `/framework/${row.package}`,
    },
    { key: 'size', header: 'Node Modules Size' },
  ],
  data: frameworks.map(({ name, package: pkg, sizeMb }) => ({
    name,
    package: pkg,
    size: pkg === 'app-pracht' ? undefined : `${sizeMb} MB`,
  })),
})

export type FixtureName = 'barChart' | 'statsTable'

type Component = Parameters<AstroContainer['renderToString']>[0]

const fixtures: Record<
  FixtureName,
  () => { component: Component; props: Record<string, unknown> }
> = {
  barChart: () => ({ component: ComparisonBarChart, props: barChart() }),
  statsTable: () => ({ component: StatsTable, props: statsTable() }),
}

export async function renderFixture(name: FixtureName) {
  const { component, props } = fixtures[name]()
  const container = await AstroContainer.create()
  return container.renderToString(component, { props })
}
