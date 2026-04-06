'use client'

import dynamic from 'next/dynamic'

const SpaTable = dynamic(() => import('./SpaTable'), { ssr: false })

export default function SpaPage() {
  return <SpaTable />
}
