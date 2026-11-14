import { useParams } from '@void/react'

export default function ClientSideRenderedDetailPage() {
  const { id } = useParams<'/client-side-rendered/[id]'>()

  return <p id="detail-id">{id}</p>
}
