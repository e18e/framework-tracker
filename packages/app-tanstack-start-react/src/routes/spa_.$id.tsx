import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/spa_/$id')({
  component: SpaDetailPage,
})

function SpaDetailPage() {
  const { id } = Route.useParams()

  return <p id="detail-id">{id}</p>
}
