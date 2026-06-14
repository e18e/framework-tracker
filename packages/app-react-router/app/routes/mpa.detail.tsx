import type { Route } from './+types/mpa.detail'

export async function loader({ params }: Route.LoaderArgs) {
  const id = params.id
  return { id }
}

export default function MpaDetailPage({ loaderData }: Route.ComponentProps) {
  return <p id="detail-id">{loaderData.id}</p>
}
