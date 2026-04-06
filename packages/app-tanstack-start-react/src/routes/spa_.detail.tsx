import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/spa_/detail')({
  validateSearch: (search) => ({
    id: typeof search.id === 'string' ? search.id : undefined,
  }),
  component: SpaDetailPage,
})

function SpaDetailPage() {
  const { id } = Route.useSearch()

  return <p id="detail-id">{id}</p>
}
