import { Suspense } from 'react'
import { getTestData } from '../../data'
import { Table } from './table'

export default function SSRThroughputPage() {
  return (
    <Suspense fallback={null}>
      <RequestTable />
    </Suspense>
  )
}

async function RequestTable() {
  return <Table data={await getTestData()} />
}
