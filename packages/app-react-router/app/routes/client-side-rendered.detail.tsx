import { useParams } from 'react-router'

export default function ClientSideRenderedDetailPage() {
  const { id } = useParams()

  return <p id="detail-id">{id}</p>
}
