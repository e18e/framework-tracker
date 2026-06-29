import { testData } from '../../../testdata/src/ssr'
import { Table } from './table'

export const dynamic = 'force-dynamic'

export default async function SSRThroughputPage() {
  return <Table data={await testData()} />
}
