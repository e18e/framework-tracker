import { connection } from 'next/server'

export async function getTestData() {
  await connection()
  // The shared fixture creates UUIDs once per module instance, at request time.
  const { testData } = await import('../testdata/src/ssr')
  return testData()
}
