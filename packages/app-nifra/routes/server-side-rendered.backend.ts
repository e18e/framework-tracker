import { t } from '@nifrajs/schema'
import { testData } from '../../testdata/src/ssr'

export const loaderOutput = t.object({
  entries: t.array(t.object({ id: t.string(), name: t.string() })),
})

export async function loader() {
  return { entries: await testData() }
}
