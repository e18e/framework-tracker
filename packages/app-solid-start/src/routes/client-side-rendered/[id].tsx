import { clientOnly } from '@solidjs/start'

const ClientSideRenderedDetail = clientOnly(
  () => import('../../components/ClientSideRenderedDetail'),
)

export default function ClientSideRenderedDetailPage() {
  return <ClientSideRenderedDetail />
}
