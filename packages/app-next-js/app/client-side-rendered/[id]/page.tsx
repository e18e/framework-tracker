'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'

const ClientSideRenderedDetail = dynamic(
  () => import('./ClientSideRenderedDetail'),
  { ssr: false },
)

export default function ClientSideRenderedDetailPage() {
  return (
    <Suspense fallback={null}>
      <ClientSideRenderedDetail />
    </Suspense>
  )
}
