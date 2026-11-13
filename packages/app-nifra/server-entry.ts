import { inProcessClient } from '@nifrajs/client'
import { createWebApp } from '@nifrajs/web'
import { adapter } from './backend/framework'
import { backend } from './backend/app'
import {
  clientEntry,
  cssLoading,
  manifest,
  routeStyles,
  styles,
} from './server-manifest'

export const app = createWebApp({
  adapter,
  cacheRouteModules: true,
  manifest,
  clientEntry,
  styles,
  routeStyles,
  cssLoading,
  api: inProcessClient(backend),
  title: 'nifra',
})
