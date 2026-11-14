import type { Props } from './[id].server'

export default function ClientSideRenderedDetailPage({ id }: Props) {
  return <p id="detail-id">{id}</p>
}
