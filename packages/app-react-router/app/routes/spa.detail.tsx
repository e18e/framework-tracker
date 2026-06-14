import { useParams } from 'react-router'

export default function SpaDetailPage() {
  const { id } = useParams()

  return <p id="detail-id">{id}</p>
}
