import { writeFileSync } from 'node:fs'
import { getLatestFrameworksCWV } from './cwv.ts'

async function main() {
  console.info('Starting CWV Query')
  const stats = await getLatestFrameworksCWV()
  const replacer = null
  const spacing = 2
  const json = JSON.stringify(stats, replacer, spacing)
  writeFileSync('/app/cwv-stats.json', json)
  console.info('Written CWV stats to /app/cwv-stats.json')
}

main()
  .catch(console.error)
  .finally(() => console.info('Finished LCP Query'))
