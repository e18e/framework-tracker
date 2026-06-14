'use client'

import { useParams } from 'next/navigation'

export default function SpaDetailPage() {
  const params = useParams<{ id: string }>()

  return <p id="detail-id">{params.id}</p>
}
