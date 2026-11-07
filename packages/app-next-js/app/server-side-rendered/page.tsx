import { getTestData } from '../../data'
import { Table } from './table'
export const instant = false

export default async function ServerSideRenderedPage() {
  return <Table entries={await getTestData()} />
}
