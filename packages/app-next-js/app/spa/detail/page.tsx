'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function DetailContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')

  return <p id="detail-id">{id}</p>
}

export default function SpaDetailPage() {
  return (
    <Suspense>
      <DetailContent />
    </Suspense>
  )
}
