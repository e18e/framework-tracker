async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${url} responded with ${response.status}`)
  }
  return (await response.json()) as T
}

export async function getPublishTimes(
  frameworkPackage: string,
): Promise<Record<string, string>> {
  if (frameworkPackage === 'node') {
    const releases = await fetchJson<Array<{ version: string; date: string }>>(
      'https://nodejs.org/dist/index.json',
    )
    return Object.fromEntries(
      releases.map((release) => [
        release.version.replace(/^v/, ''),
        new Date(release.date).toISOString(),
      ]),
    )
  }

  const metadata = await fetchJson<{ time: Record<string, string> }>(
    `https://registry.npmjs.org/${frameworkPackage.replace('/', '%2F')}`,
  )
  return metadata.time
}

export function withReleasedAt<T extends object>(
  stats: T,
  releasedAt: string | undefined,
): T {
  const entries = Object.entries(stats).filter(([key]) => key !== 'releasedAt')
  if (releasedAt == null) return Object.fromEntries(entries) as T

  const index = entries.findIndex(([key]) => key === 'frameworkVersion')
  entries.splice(index === -1 ? entries.length : index + 1, 0, [
    'releasedAt',
    releasedAt,
  ])
  return Object.fromEntries(entries) as T
}
