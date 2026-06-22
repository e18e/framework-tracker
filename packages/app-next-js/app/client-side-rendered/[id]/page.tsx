'use client'

import { useParams } from 'next/navigation'

export default function ClientSideRenderedDetailPage() {
  const params = useParams<{ id: string }>()

  return <p id="detail-id">{params.id}</p>
}
