export const dynamic = 'force-dynamic'

import { testData } from '@framework-tracker/testdata'
import { Table } from './table'

export default async function App() {
  return <Table data={await testData()} />
}
