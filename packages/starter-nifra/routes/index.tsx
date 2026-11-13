import { href, Link } from '@nifrajs/web-react/router'
import type { Route } from './+types/index'

export default function Home(_props: Route.ComponentProps) {
  return (
    <>
      <h1>Nifra</h1>
      <p>A typed React app built with Nifra.</p>
      <Link to={href({ to: '/about' })}>About</Link>
    </>
  )
}
