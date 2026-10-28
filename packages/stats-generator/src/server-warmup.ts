const SERVER_WARMUP_TIMEOUT_MS = 10_000

async function fetchPage(url: string, signal: AbortSignal): Promise<void> {
  const response = await fetch(url, { signal })
  await response.arrayBuffer()
  if (!response.ok) {
    throw new Error(`Server warm-up failed for ${url}: HTTP ${response.status}`)
  }
}

export async function warmUpServer(
  url: string,
  warmDetailPage = false,
): Promise<void> {
  const signal = AbortSignal.timeout(SERVER_WARMUP_TIMEOUT_MS)
  await fetchPage(url, signal)
  if (warmDetailPage) {
    await fetchPage(`${url}/${crypto.randomUUID()}`, signal)
  }
}
