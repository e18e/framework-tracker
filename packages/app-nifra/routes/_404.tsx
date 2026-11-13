import { href, Link } from '@nifrajs/web-react/router'
import type { Route } from './+types/_404'

export default function NotFound(_props: Route.ComponentProps) {
  return (
    <>
      <h1>Not found</h1>
      <Link to={href({ to: '/' })}>Back home</Link>
    </>
  )
}
