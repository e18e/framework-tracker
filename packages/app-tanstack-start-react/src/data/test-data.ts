import { createServerFn } from '@tanstack/react-start'
import { testData } from '../../../testdata/src/ssr'

export const getTestData = createServerFn({ method: 'GET' }).handler(
  async () => await testData(),
)
