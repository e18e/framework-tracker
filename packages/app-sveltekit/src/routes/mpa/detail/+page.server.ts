import type { PageServerLoad } from './$types'

export const load: PageServerLoad = ({ url }) => {
  const id = url.searchParams.get('id')
  return { id }
}
