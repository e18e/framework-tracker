import { useParams } from '@solidjs/router'

export const ssr = false

export default function SpaDetailPage() {
  const params = useParams()

  return <p id="detail-id">{params.id}</p>
}
