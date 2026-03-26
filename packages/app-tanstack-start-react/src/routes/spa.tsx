import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/spa')({
  component: SpaPage,
})

function SpaPage() {
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  // TanStack Start SSRs routes by default — useEffect ensures the button only
  // renders client-side so FCP measures CSR, not server-rendered HTML
  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return (
    <button
      id="interact-btn"
      onClick={() => router.navigate({ to: '/spa/result' })}
    >
      Run Benchmark
    </button>
  )
}
