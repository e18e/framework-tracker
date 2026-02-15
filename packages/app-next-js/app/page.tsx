export const dynamic = 'force-dynamic'

import { testData } from '../../testdata/src/ssr'
import { Table } from './table'

export default async function App() {
  return <Table data={await testData()} />
}
