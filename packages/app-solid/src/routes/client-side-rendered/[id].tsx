import { clientOnly } from '@solidjs/web'

const ClientSideRenderedDetail = clientOnly(
  () => import('../../components/ClientSideRenderedDetail'),
)

export default function ClientSideRenderedDetailPage() {
  return <ClientSideRenderedDetail />
}
