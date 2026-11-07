'use client'

import dynamic from 'next/dynamic'

const ClientSideRenderedDetail = dynamic(
  () => import('./ClientSideRenderedDetail'),
  { ssr: false },
)

export default function ClientSideRenderedDetailPage() {
  return <ClientSideRenderedDetail />
}
