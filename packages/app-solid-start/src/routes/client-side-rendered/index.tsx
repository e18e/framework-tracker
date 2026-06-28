import { clientOnly } from '@solidjs/start'

const ClientSideRenderedTable = clientOnly(
  () => import('../../components/ClientSideRenderedTable'),
)

export default function ClientSideRenderedPage() {
  return <ClientSideRenderedTable />
}
