export const SERVER_WARMUP_REQUEST_COUNT = 5

export async function warmUpServer(url: string): Promise<void> {
  for (let i = 0; i < SERVER_WARMUP_REQUEST_COUNT; i++) {
    const response = await fetch(url)
    await response.arrayBuffer()
    if (!response.ok) {
      throw new Error(
        `Server warm-up failed for ${url}: HTTP ${response.status}`,
      )
    }
  }
}
