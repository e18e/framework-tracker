import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/client-side-rendered_/$id')({
  ssr: false,
  component: ClientSideRenderedDetailPage,
})

function ClientSideRenderedDetailPage() {
  const { id } = Route.useParams()

  return <p id="detail-id">{id}</p>
}
