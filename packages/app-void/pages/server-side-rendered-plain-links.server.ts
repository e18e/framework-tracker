import { defineHandler, type InferProps } from 'void'
import { testData } from '../../testdata/src/ssr'

export const prerender = false
export const loader = defineHandler(async () => ({ data: await testData() }))
export type Props = InferProps<typeof loader>
