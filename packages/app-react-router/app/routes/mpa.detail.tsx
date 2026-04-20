import type { Route } from './+types/mpa.detail'

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  return { id }
}

export default function MpaDetailPage({ loaderData }: Route.ComponentProps) {
  return <p id="detail-id">{loaderData.id}</p>
}
