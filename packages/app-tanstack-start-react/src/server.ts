import handler, { createServerEntry } from '@tanstack/react-start/server-entry'
import { FastResponse } from 'srvx'

// Nitro serves this app on Node.js through srvx. Use its optimized response path.
globalThis.Response = FastResponse

export default createServerEntry({
  fetch(request) {
    return handler.fetch(request)
  },
})
