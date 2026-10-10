import type { LoaderArgs, RouteComponentProps } from '@pracht/core'

export async function loader({ params }: LoaderArgs) {
  return { id: params.id }
}

export function Component({ data }: RouteComponentProps<typeof loader>) {
  return <p id="detail-id">{data.id}</p>
}
