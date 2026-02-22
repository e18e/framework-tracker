import { getCollection } from 'astro:content'

const runtimeEntries = await getCollection('runtime')

const ssrStats = runtimeEntries
  .map((entry) => entry.data)
  .sort((a, b) => a.order - b.order)

export { ssrStats }
