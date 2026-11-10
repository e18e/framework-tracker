import { testData } from '../../../testdata/src/ssr.ts'

export const TABLE_DATA_ID = 'table-data'

/**
 * The server renders the rows into the page with <TableData>,
 * so that the browser rehydrates the same rows that the server rendered.
 */
export function loadTableData() {
  if (import.meta.env.SSR) return testData()

  let rendered = document.getElementById(TABLE_DATA_ID)

  if (rendered) return JSON.parse(rendered.textContent)

  return testData()
}
