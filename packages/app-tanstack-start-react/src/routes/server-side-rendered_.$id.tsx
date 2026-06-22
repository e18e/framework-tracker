import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/server-side-rendered_/$id')({
  component: ServerSideRenderedDetailPage,
})

function ServerSideRenderedDetailPage() {
  const { id } = Route.useParams()

  return <p id="detail-id">{id}</p>
}
