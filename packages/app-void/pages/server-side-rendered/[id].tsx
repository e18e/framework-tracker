import type { Props } from './[id].server'

export default function ServerSideRenderedDetailPage({ id }: Props) {
  return <p id="detail-id">{id}</p>
}
