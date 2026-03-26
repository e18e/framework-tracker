import { useState, useEffect } from 'react'

type Entry = { id: string; name: string }

function generateData(): Entry[] {
  return Array.from({ length: 1000 }, () => ({
    id: crypto.randomUUID(),
    name: crypto.randomUUID(),
  }))
}

export default function SpaResult() {
  const [entries, setEntries] = useState<Entry[] | null>(null)

  useEffect(() => {
    setEntries(generateData())
  }, [])

  if (entries === null) return null

  return (
    <table>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id}>
            <td>{entry.id}</td>
            <td>{entry.name}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
