import { useParams } from '@nifrajs/web-react/router'
import type { Route } from './+types/[id]'

export const ssr = false

export default function ClientSideRenderedDetail(_props: Route.ComponentProps) {
  return <p id="detail-id">{useParams<Route.Params>().id}</p>
}
