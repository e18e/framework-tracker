import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/mpa_/detail')({
  loaderDeps: ({ search }) => ({ id: search.id }),
  loader: ({ deps }) => {
    return { id: deps.id as string | undefined }
  },
  component: MpaDetailPage,
})

function MpaDetailPage() {
  const { id } = Route.useLoaderData()

  return <p id="detail-id">{id}</p>
}
