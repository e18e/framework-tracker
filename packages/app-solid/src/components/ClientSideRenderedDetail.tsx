import { useParams } from '@solidjs/router'

export default function ClientSideRenderedDetail() {
  const params = useParams()

  return <p id="detail-id">{params.id}</p>
}
