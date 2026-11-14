import { defineHandler, type InferProps } from 'void'

export const ssr = false
export const prerender = false
export const loader = defineHandler((c) => ({ id: c.req.param('id') }))
export type Props = InferProps<typeof loader>
