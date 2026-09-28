import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

export const Route = createFileRoute('/demo/api/names')({
  // @ts-expect-error TanStack Start's server route option is missing from the TypeScript 7 route type.
  server: {
    handlers: {
      GET: () => json(['Alice', 'Bob', 'Charlie']),
    },
  },
})
