import type { Route } from './+types/server-side-rendered.detail'

export async function loader({ params }: Route.LoaderArgs) {
  const id = params.id
  return { id }
}

export default function ServerSideRenderedDetailPage({
  loaderData,
}: Route.ComponentProps) {
  return <p id="detail-id">{loaderData.id}</p>
}
