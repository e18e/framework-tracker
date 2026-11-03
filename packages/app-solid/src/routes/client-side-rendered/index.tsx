import { clientOnly } from '@solidjs/web'

const ClientSideRenderedTable = clientOnly(
  () => import('../../components/ClientSideRenderedTable'),
)

export default function ClientSideRenderedPage() {
  return <ClientSideRenderedTable />
}
