import { testData } from '../../../testdata/src/ssr'

export const load = async () => {
  return { entries: await testData() }
}
