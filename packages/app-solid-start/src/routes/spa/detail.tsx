import { useSearchParams } from '@solidjs/router'

export const ssr = false

export default function SpaDetailPage() {
  const [searchParams] = useSearchParams()

  return <p id="detail-id">{searchParams.id}</p>
}
