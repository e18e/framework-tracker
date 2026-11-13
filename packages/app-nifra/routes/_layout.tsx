import type { ReactNode } from 'react'
import { href, Link } from '@nifrajs/web-react/router'
import type { Route } from './+types/_layout'

export default function Layout({ children }: Route.ComponentProps<ReactNode>) {
  return (
    <>
      <nav>
        <Link to={href({ to: '/' })}>Nifra</Link>
        {' | '}
        <Link to={href({ to: '/server-side-rendered' })}>SSR</Link>
        {' | '}
        <Link to={href({ to: '/client-side-rendered' })}>CSR</Link>
      </nav>
      <main>{children}</main>
    </>
  )
}
