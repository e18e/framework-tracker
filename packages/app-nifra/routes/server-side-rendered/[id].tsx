import { useParams } from '@nifrajs/web-react/router'
import type { Route } from './+types/[id]'

export default function ServerSideRenderedDetail(_props: Route.ComponentProps) {
  return <p id="detail-id">{useParams<Route.Params>().id}</p>
}
