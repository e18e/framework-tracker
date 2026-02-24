import { getFrameworksLCP } from './lcp.ts'
import { frameworks } from '../frameworks/frameworks.ts'

async function main() {
  console.info('Starting LCP Query')
  const stats = await getFrameworksLCP([...frameworks])
  console.info(stats)
}

main()
  .catch(console.error)
  .finally(() => console.info('Finished LCP Query'))
