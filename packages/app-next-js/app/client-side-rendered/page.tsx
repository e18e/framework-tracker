'use client'

import dynamic from 'next/dynamic'

const ClientSideRenderedTable = dynamic(
  () => import('./ClientSideRenderedTable'),
  { ssr: false },
)

export default function ClientSideRenderedPage() {
  return <ClientSideRenderedTable />
}
