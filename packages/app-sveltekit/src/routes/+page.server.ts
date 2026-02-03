import { testData } from '@framework-tracker/testdata'

export const load = async () => {
  return { entries: await testData() }
}
