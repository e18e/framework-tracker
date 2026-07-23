import type { PageLoad } from './$types'

type Entry = { id: string; name: string }

function generateData(): Entry[] {
  return Array.from({ length: 1000 }, () => ({
    id: crypto.randomUUID(),
    name: crypto.randomUUID(),
  }))
}

export const ssr = false
export const prerender = true

export const load: PageLoad = () => {
  return { entries: generateData() }
}
