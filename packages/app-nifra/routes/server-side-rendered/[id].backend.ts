import { t } from '@nifrajs/schema'
import type { Route } from './+types/[id]'

export const loaderOutput = t.object({ id: t.string() })

export const loader: Route.Loader = async ({ params }) => {
  return { id: params.id }
}
