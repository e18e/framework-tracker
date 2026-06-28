import type { Route } from './+types/client-side-rendered.detail'

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  return { id: params.id }
}

clientLoader.hydrate = true as const

export function HydrateFallback() {
  return null
}

export default function ClientSideRenderedDetailPage({
  loaderData,
}: Route.ComponentProps) {
  return <p id="detail-id">{loaderData.id}</p>
}
