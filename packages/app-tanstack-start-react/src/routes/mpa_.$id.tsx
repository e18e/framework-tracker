import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/mpa_/$id')({
  component: MpaDetailPage,
})

function MpaDetailPage() {
  const { id } = Route.useParams()

  return <p id="detail-id">{id}</p>
}
