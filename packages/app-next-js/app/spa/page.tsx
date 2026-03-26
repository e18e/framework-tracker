'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SpaPage() {
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  // 'use client' components are still SSR'd in Next.js — useEffect ensures the
  // button only renders client-side so FCP measures CSR, not server-rendered HTML
  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return (
    <button id="interact-btn" onClick={() => router.push('/spa/result')}>
      Run Benchmark
    </button>
  )
}
