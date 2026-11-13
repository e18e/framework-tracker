import type { ReactNode } from 'react'
import { href, Link } from '@nifrajs/web-react/router'
import type { Route } from './+types/_layout'

export default function Layout({ children }: Route.ComponentProps<ReactNode>) {
  return (
    <>
      <nav>
        <Link to={href({ to: '/' })}>Nifra starter</Link>
      </nav>
      <main>{children}</main>
    </>
  )
}
