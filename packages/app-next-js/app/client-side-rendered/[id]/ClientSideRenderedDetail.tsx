'use client'

import { useParams } from 'next/navigation'

export default function ClientSideRenderedDetail() {
  const params = useParams<{ id: string }>()

  return <p id="detail-id">{params.id}</p>
}
