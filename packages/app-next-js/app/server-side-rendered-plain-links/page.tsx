import { getTestData } from '../../data'
import { RequestTable } from './table'

export const instant = false

export default async function ServerSideRenderedPage() {
  const entries = await getTestData()

  return <RequestTable entries={entries} />
}
