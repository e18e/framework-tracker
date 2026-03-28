import { useSearchParams } from 'react-router'

export default function SpaDetailPage() {
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id')

  return <p id="detail-id">{id}</p>
}
