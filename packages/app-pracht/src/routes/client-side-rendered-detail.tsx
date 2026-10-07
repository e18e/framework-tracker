import { useParams } from '@pracht/core'

export function Component() {
  const params = useParams()

  return <p id="detail-id">{params.id}</p>
}
