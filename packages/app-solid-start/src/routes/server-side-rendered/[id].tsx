import { useParams } from '@solidjs/router'

export default function ServerSideRenderedDetailPage() {
  const params = useParams()

  return <p id="detail-id">{params.id}</p>
}
