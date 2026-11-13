import { href, Link } from '@nifrajs/web-react/router'
import type { Route } from './+types/about'

export default function About(_props: Route.ComponentProps) {
  return (
    <>
      <h1>About</h1>
      <p>File-based routes, server rendering, and typed navigation.</p>
      <Link to={href({ to: '/' })}>Home</Link>
    </>
  )
}
