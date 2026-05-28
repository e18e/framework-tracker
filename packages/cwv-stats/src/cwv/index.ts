import { getFrameworksCWV } from './cwv.ts'

async function main() {
  console.info('Starting CWV Query')
  const stats = await getFrameworksCWV()
  console.info(stats)
}

main()
  .catch(console.error)
  .finally(() => console.info('Finished LCP Query'))
