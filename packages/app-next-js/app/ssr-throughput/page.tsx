import { getTestData } from '../../data'
import { Table } from './table'

export const instant = false

export default async function SSRThroughputPage() {
  return <Table data={await getTestData()} />
}
