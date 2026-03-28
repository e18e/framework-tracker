export const ssr = false

import { useSearchParams } from '@solidjs/router'

export default function SpaDetailPage() {
  const [searchParams] = useSearchParams()

  return <p id="detail-id">{searchParams.id}</p>
}
