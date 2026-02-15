export interface TableEntry {
  id: string
  name: string
}

const data: TableEntry[] = Array(1000)
  .fill(0)
  .map(() => ({
    id: crypto.randomUUID(),
    name: crypto.randomUUID(),
  }))

export function testData(): Promise<TableEntry[]> {
  return new Promise((resolve) => setTimeout(() => resolve(data), 0))
}
