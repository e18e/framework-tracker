import { useParams } from '@solidjs/router'

export const ssr = false

export default function ClientSideRenderedDetailPage() {
  const params = useParams()

  return <p id="detail-id">{params.id}</p>
}
