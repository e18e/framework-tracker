import { useSearchParams } from '@solidjs/router'

export default function MpaDetailPage() {
  const [searchParams] = useSearchParams()

  return <p id="detail-id">{searchParams.id}</p>
}
