import { href, Link } from '@nifrajs/web-react/router'
import type { Route } from './+types/index'

export default function Home(_props: Route.ComponentProps) {
  return (
    <>
      <h1>Nifra framework performance</h1>
      <ul>
        <li>
          <Link to={href({ to: '/initial-load' })}>Initial load</Link>
        </li>
        <li>
          <Link to={href({ to: '/server-side-rendered' })}>
            SSR with router links
          </Link>
        </li>
        <li>
          <Link to={href({ to: '/server-side-rendered-plain-links' })}>
            SSR with plain links
          </Link>
        </li>
        <li>
          <Link to={href({ to: '/client-side-rendered' })}>
            Client-side rendered
          </Link>
        </li>
        <li>
          <Link to={href({ to: '/ssr-throughput' })}>SSR throughput</Link>
        </li>
      </ul>
    </>
  )
}
