import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/mpa_/detail')({
  validateSearch: (search) => ({
    id: typeof search.id === 'string' ? search.id : undefined,
  }),
  component: MpaDetailPage,
})

function MpaDetailPage() {
  const { id } = Route.useSearch()

  return <p id="detail-id">{id}</p>
}
